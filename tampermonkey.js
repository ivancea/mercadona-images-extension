// ==UserScript==
// @name         Mercadona - Imágenes
// @namespace    http://tampermonkey.net/
// @version      2023-12-22
// @description  Add images to old Mercadona catalog
// @author       Iván Cea Fontenla
// @match        https://www.telecompra.mercadona.es/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mercadona.es
// @grant        none
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

function updateHtml(window, document) {
  const table = document.getElementById("TaulaLlista");

  if (!table || table.dataset.filledWithImages === "true") {
    return;
  }

  table.dataset.filledWithImages = "true";

  document.body.appendChild(document.createElement("style")).textContent = `
    img.articleImage {
      object-fit: contain;
      width: 24px;
      height: 24px;
      float: left;
      transition: transform .2s;
      transform-origin: left center;
    }

    img.articleImage:hover {
      transform: scale(20);
      z-index: 9999;
    }
  `;

  const rows = table.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    const articleCell = row.querySelector("[headers=header1]");
    const addToCartImage = row.querySelector("[headers=header4] > img");

    const match = /incluir\(\d*,event,'\d*','(\d*)'/.exec(
      addToCartImage.onclick
    );

    if (!match) {
      return;
    }

    const articleId = match[1];

    const image = document.createElement("img");

    image.src = `https://raw.githubusercontent.com/ivancea/mercadona-images-extension/master/product-images/${articleId}.jpg`;
    image.classList.add("articleImage");
    image.onerror = () => (image.style.display = "none");

    articleCell.prepend(image);
  });
}
