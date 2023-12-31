// ==UserScript==
// @name         Mercadona - Images
// @namespace    http://tampermonkey.net/
// @version      2023-12-22
// @description  Add images to old Mercadona catalog
// @author       Iván Cea Fontenla
// @match        https://www.telecompra.mercadona.es/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mercadona.es
// @grant        GM_xmlhttpRequest
// @connect      tienda.mercadona.es
// ==/UserScript==

(function () {
  "use strict";

  window.addEventListener(
    "load",
    () => {
      const mainFrameWindow =
        document.getElementById("mainFrame")?.contentWindow;

      if (!mainFrameWindow) {
        return;
      }

      setInterval(() => {
        mainFrameWindow.launchScript = function (fn) {
          fn.call(this, this.window);
        };

        mainFrameWindow.launchScript((window) => {
          updateHtml(window, window.document);
        });
      }, 500);
    },
    false
  );
})();

async function updateHtml(window, document) {
  const table = document.getElementById("TaulaLlista");

  if (!table || table.dataset.processed === "true") {
    return;
  }

  table.dataset.processed = "true";

  document.body.appendChild(document.createElement("style")).textContent = `
    .gridContainer {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      align-items: center;
    }

    .gridContainer > .articleContainer {
      align-self: stretch;
      display: flex;
      flex-direction: column;
      gap: 5px;
      border: 5px solid #ccccaa;
    }

    .gridContainer > .articleContainer:nth-child(odd) {
      background-color: #ffffcc;
    }

    .gridContainer > .articleContainer > div {
      text-align: center
    }

    .gridContainer > .articleContainer > .imageContainer {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      min-height: 250px;
    }

    .gridContainer > .articleContainer > .imageContainer > img {
      width: 100%;
      object-fit: contain;
    }

    .gridContainer > .articleContainer > .actionsContainer {
      display: flex;
      flex-direction: row;
      gap: 10px;
      justify-content: center;
      align-items: center;
    }
  `;

  const rows = [...table.querySelectorAll("tbody tr")];

  const articles = await Promise.all(
    rows.map(async (row) => await getArticleFromRow(window, row))
  );

  if (articles.some((article) => article === undefined)) {
    console.warn("Failed to get all articles", articles);
    return;
  }

  const oldForm = document.getElementById("Tots");
  oldForm.id = "OldTots";
  oldForm.name = "OldTots";

  const newForm = document.createElement("form");
  newForm.id = "Tots";
  newForm.name = "Tots";

  const container = document.createElement("div");
  container.classList.add("gridContainer");

  for (const article of articles) {
    container.append(makeArticleElement(article));
  }

  newForm.append(container);
  table.parentNode.append(newForm);
  table.style.display = "none";
}

function makeArticleElement(article) {
  const articleContainer = document.createElement("div");
  articleContainer.classList.add("articleContainer");

  const textContainer = document.createElement("div");
  textContainer.classList.add("textContainer");
  textContainer.textContent = article.name;
  articleContainer.append(textContainer);

  const imageContainer = document.createElement("div");
  imageContainer.classList.add("imageContainer");
  articleContainer.append(imageContainer);

  article.dataPromise?.then((data) => {
    const photoUrl = data?.photos?.[0]?.regular;

    if (photoUrl) {
      const image = document.createElement("img");
      image.src = photoUrl;
      image.onerror = () => {
        imageContainer.remove();
      };
      imageContainer.append(image);
    }
  });

  const priceContainer = document.createElement("div");
  priceContainer.classList.add("priceContainer");
  priceContainer.textContent = article.prices?.join(" / ");
  articleContainer.append(priceContainer);

  const actionsContainer = document.createElement("div");
  actionsContainer.classList.add("actionsContainer");
  if (article.detailsHref) {
    const detailsLink = document.createElement("a");
    detailsLink.href = article.detailsHref;
    detailsLink.textContent = "Detalles";
    actionsContainer.append(detailsLink);
  }
  const quantitySelectorElement = document.createElement("span");
  quantitySelectorElement.append(...article.quantitySelectorElements);
  actionsContainer.append(quantitySelectorElement);
  actionsContainer.append(article.addToCartButton);
  articleContainer.append(actionsContainer);

  return articleContainer;
}

async function getArticleFromRow(window, row) {
  const articleName = row.querySelector(
    "[headers=header1] > span"
  )?.textContent;
  const [detailsHeader, priceHeader] =
    row.querySelectorAll("[headers=header2]");
  const articleDetailsHref = detailsHeader.querySelector("span > a")?.href;
  const articlePriceSpans = [...priceHeader.querySelectorAll("span")];
  const articlePrices = articlePriceSpans.map((span) => span.textContent);
  const articleQuantitySelectorElements = row.querySelectorAll(
    "[headers=header3] > *"
  );
  const articleAddToCartButton = row.querySelector("[headers=header4] > img");

  const articleIdsByLineNumber = loadArticleIdsByLineNumber(window);

  const lineNumber = articlePriceSpans[0].id.replace("txtPrecio", "");

  const articleId = articleIdsByLineNumber[lineNumber];

  const articleDataPromise = getArticleData(articleId).catch((error) => {
    console.warn(`Failed fetching article ${articleId} data `, error);
  });

  return {
    id: articleId,
    name: articleName,
    detailsHref: articleDetailsHref,
    prices: articlePrices,
    quantitySelectorElements: articleQuantitySelectorElements,
    addToCartButton: articleAddToCartButton,
    dataPromise: articleDataPromise,
  };
}

function loadArticleIdsByLineNumber(window) {
  const scripts = [...window.document.querySelectorAll("script")].map(
    (s) => s.textContent
  );

  let currentLineNumber = 1;
  const articleIdsByLineNumber = {};

  for (const script of scripts) {
    const regex = /InsertaLinea\((\d+),/g;
    let match;
    while ((match = regex.exec(script))) {
      articleIdsByLineNumber[currentLineNumber] = match[1];
      currentLineNumber++;
    }
  }

  return articleIdsByLineNumber;
}

async function getArticleData(articleId) {
  const url = `https://tienda.mercadona.es/api/products/${articleId}/?lang=es&wh=mad1`;

  if (typeof GM_xmlhttpRequest === "undefined") {
    const corsUrl = "https://corsproxy.io/?" + encodeURIComponent(url);

    return fetch(corsUrl).then((response) => response.json());
  }

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: function (response) {
        try {
          const json = JSON.parse(response.responseText);

          if (json.errors) {
            reject({
              description: `Errors found in response from ${url}`,
              error: json,
            });
          } else {
            resolve(json);
          }
        } catch (error) {
          reject({ description: `Error parsing JSON from ${url}`, error });
        }
      },
      onerror: function (error) {
        reject({ description: `Error fetching ${url}`, error });
      },
    });
  });
}
