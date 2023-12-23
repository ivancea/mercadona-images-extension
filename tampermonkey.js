// ==UserScript==
// @name         Mercadona - Images
// @namespace    http://tampermonkey.net/
// @version      2023-12-22
// @description  Add images to old Mercadona catalog
// @author       Iván Cea Fontenla
// @match        https://www.telecompra.mercadona.es/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mercadona.es
// @grant        GM_xmlhttpRequest
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
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      align-items: center;
      border: 10px solid #ffffcc;
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
    rows.map(async (row) => await getArticleFromRow(row))
  );

  const container = document.createElement("div");
  container.classList.add("gridContainer");

  for (const article of articles) {
    container.append(makeArticleElement(article));
  }

  table.parentNode.append(container);
  table.style.display = "none";
}

function makeArticleElement(article) {
  const articleContainer = document.createElement("div");
  articleContainer.classList.add("articleContainer");

  const textContainer = document.createElement("div");
  textContainer.classList.add("textContainer");
  textContainer.textContent = article.name;
  articleContainer.append(textContainer);

  const photoUrl = article.data?.photos?.[0]?.regular;
  if (photoUrl) {
    const imageContainer = document.createElement("div");
    imageContainer.classList.add("imageContainer");
    const image = document.createElement("img");
    image.src = photoUrl;
    image.onerror = () => {
      imageContainer.remove();
    };
    imageContainer.append(image);
    articleContainer.append(imageContainer);
  }

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

async function getArticleFromRow(row) {
  const articleName = row.querySelector(
    "[headers=header1] > span"
  )?.textContent;
  const [detailsHeader, priceHeaders] =
    row.querySelectorAll("[headers=header2]");
  const articleDetailsHref = detailsHeader.querySelector("span > a")?.href;
  const articlePrices = [...priceHeaders.querySelectorAll("span")].map(
    (span) => span.textContent
  );
  const articleQuantitySelectorElements = row.querySelectorAll(
    "[headers=header3] > *"
  );
  const articleAddToCartButton = row.querySelector("[headers=header4] > img");

  const match = /incluir\(\d*,event,'\d*','(\d*)'/.exec(
    articleAddToCartButton.onclick
  );

  if (!match) {
    return undefined;
  }

  const articleId = match[1];

  const articleData = await getArticleData(articleId);

  return {
    id: articleId,
    name: articleName,
    detailsHref: articleDetailsHref,
    prices: articlePrices,
    quantitySelectorElements: articleQuantitySelectorElements,
    addToCartButton: articleAddToCartButton,
    data: articleData,
  };
}

async function getArticleData(articleId) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: `https://tienda.mercadona.es/api/products/${articleId}/?lang=es&wh=mad1`,
      onload: function (response) {
        try {
          resolve(JSON.parse(response.responseText));
        } catch (error) {
          reject(error);
        }
      },
      onerror: function (error) {
        reject(error);
      },
    });
  });
}
