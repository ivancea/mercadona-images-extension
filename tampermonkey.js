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
      }, 2000);
    },
    false
  );
})();

async function updateHtml(window, document) {
  const table = document.getElementById("TaulaLlista");

  if (!table || table.dataset.filledWithImages === "true") {
    return;
  }

  table.dataset.filledWithImages = "true";

  document.body.appendChild(document.createElement("style")).textContent = `
    img.articleImage {
      object-fit: contain;
      width: 40px;
      height: 40px;
      float: left;
      transition: transform .2s;
      transform-origin: left center;
    }

    img.articleImage:hover {
      transform: scale(10);
      z-index: 9999;
    }
  `;

  const rows = [...table.querySelectorAll("tbody tr")];

  await Promise.all(
    rows.map(async (row) => {
      const articleCell = row.querySelector("[headers=header1]");
      const addToCartImage = row.querySelector("[headers=header4] > img");

      const match = /incluir\(\d*,event,'\d*','(\d*)'/.exec(
        addToCartImage.onclick
      );

      if (!match) {
        return;
      }

      const articleId = match[1];

      const articleData = await getArticleData(articleId);
      const photoUrl = articleData?.photos?.[0]?.regular;

      if (photoUrl) {
        const image = document.createElement("img");

        image.src = photoUrl;
        image.classList.add("articleImage");
        image.onerror = () => {
          image.style.display = "none";
        };

        articleCell.prepend(image);
      }
    })
  );
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
