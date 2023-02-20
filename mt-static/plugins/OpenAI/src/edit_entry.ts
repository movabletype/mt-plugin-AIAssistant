import "../css/edit_entry.scss";

const title = document.querySelector<HTMLInputElement>("#title")!;
const titleWrap = document.createElement("div");
titleWrap.classList.add("open-ai-title-wrap");
title.parentNode?.insertBefore(titleWrap, title);
const openHint = document
  .querySelector<HTMLTemplateElement>("#plugin-open-ai-open-hint")!
  .content.cloneNode(true) as HTMLElement;
titleWrap.appendChild(title);
titleWrap.appendChild(openHint);

titleWrap.querySelector("a")!.addEventListener("click", async (ev) => {
  ev.preventDefault();
  jQuery.fn.mtModal.open(window.StaticURI + "index.html?dialog=1", {
    large: true,
  });

  const modal = document
    .querySelector<HTMLTemplateElement>("#plugin-open-ai-hint-modal")!
    .content.cloneNode(true) as HTMLElement;
  const modalWrap = document.querySelector(".mt-modal .modal-content")!;
  modalWrap.appendChild(modal);
  modalWrap.querySelector("iframe")!.style.display = "none";
  modalWrap.appendChild(modalWrap.querySelector("iframe")!);

  jQuery(window).trigger("pre_autosave");
  await window.MTBlockEditor?.serialize();

  const entryFormData = window.DOM.getFormData(
    document.querySelector(`form[method="post"]`)!
  );
  const textarea = modalWrap.querySelector<HTMLInputElement>("textarea")!;
  textarea.value = (entryFormData.text + "\n" + entryFormData.text_more)
    .replace(/<.*?>/g, "")
    .trim();

  modalWrap
    .querySelectorAll(`[data-dismiss="modal"], .mt-close-dialog`)
    .forEach((e) => {
      e.addEventListener("click", () => {
        jQuery.fn.mtModal.close();
      });
    });
  const generateButton =
    modalWrap.querySelector<HTMLButtonElement>(".btn-primary")!;
  generateButton.addEventListener("click", async (ev) => {
    ev.preventDefault();
    generateButton.disabled = true;
    generateButton.classList.add("disabled");

    const result = document.querySelector<HTMLDivElement>(
      "#plugin-open-ai-result"
    )!;
    result.style.display = "";

    const spinner = document.createElement("div");
    spinner.classList.add("plugin-open-ai-spinner");
    spinner.innerHTML = `<i class="fas fa-spinner fa-pulse"></i>`;
    result.parentNode?.insertBefore(spinner, result);

    const submitData = {
      __mode: "open_ai_generate_title",
      magic_token: entryFormData.magic_token,
      content: textarea.value,
    };
    const formData = new FormData();
    Object.keys(submitData).forEach((key) => {
      formData.append(key, submitData[key]);
    });
    const {
      result: { choices },
    } = await (
      await fetch(parent.CMSScriptURI, {
        method: "POST",
        body: formData,
      })
    ).json();

    spinner.remove();

    const list = result.querySelector("ul")!;
    list.innerHTML = "";
    choices[0].text
      .trim()
      .split("\n")
      .forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line.replace(/\d\.\s*/, "");
        list.appendChild(li);
      });

    result.style.visibility = "";
    modalWrap
      .querySelectorAll<HTMLElement>(`.plugin-open-ai-before-generate`)
      .forEach((e) => {
        e.style.display = "none";
      });
    modalWrap
      .querySelectorAll<HTMLElement>(`.plugin-open-ai-after-generate`)
      .forEach((e) => {
        e.style.display = "";
      });
  });
  jQuery(".mt-modal").one("hidden.bs.modal", () => {
    modalWrap.innerHTML = "";
    const iframe = modalWrap.querySelector("iframe");
    if (iframe) {
      iframe.style.display = "";
    }
  });
});

// function imageToBase64($img) {
//   const $canvas = document.createElement("canvas");
//   $canvas.width = $img.naturalWidth;
//   $canvas.height = $img.naturalHeight;
//   const ctx = $canvas.getContext("2d");
//   ctx?.drawImage($img, 0, 0);
//   return $canvas.toDataURL("image/png");
// }

// (async () => {
//   document
//     .querySelector("#content-body-left ul")
//     ?.appendChild(
//       document
//         .querySelector<HTMLTemplateElement>("#plugin-open-ai-panel-nav-item")!
//         .content.cloneNode(true)
//     );

//   document
//     .querySelector("#content-body-right-body")
//     ?.appendChild(
//       document
//         .querySelector<HTMLTemplateElement>("#plugin-open-ai-panel-body")!
//         .content.cloneNode(true)
//     );

//   const mainPrimaryButton = document.querySelector<HTMLButtonElement>(
//     ".actions-bar button.primary"
//   )!;
//   const primaryButton = mainPrimaryButton.cloneNode(true) as HTMLButtonElement;
//   primaryButton.className = "action button btn btn-primary d-none";
//   mainPrimaryButton.parentNode?.insertBefore(primaryButton, mainPrimaryButton);
//   jQuery("#plugin-open-ai-panel-button")
//     .on("shown.bs.tab", () => {
//       mainPrimaryButton.classList.add("d-none");
//       primaryButton.classList.remove("d-none");
//     })
//     .on("hide.bs.tab", () => {
//       mainPrimaryButton.classList.remove("d-none");
//       primaryButton.classList.add("d-none");
//     });

//   let data = {};
//   const parentSearch = new URLSearchParams(parent.document.location.search);
//   parentSearch.set("__mode", "open_ai_get_templates");
//   const { result: templates } = await (
//     await fetch(parent.CMSScriptURI + "?" + parentSearch.toString())
//   ).json();

//   if (!templates || templates.length === 0) {
//     document
//       .querySelector("#plugin-open-ai-panel-button")
//       ?.classList.add("d-none");
//     return;
//   }

//   const select = document.querySelector<HTMLSelectElement>(
//     "#plugin-open-ai-panel select"
//   )!;
//   const container = document.querySelector<HTMLSelectElement>(
//     "#plugin-open-ai-panel-image"
//   )!;
//   templates.forEach((template) => {
//     const option = document.createElement("option");
//     option.value = template.id;
//     option.textContent = template.name;
//     select.appendChild(option);
//   });
//   select.addEventListener("change", async () => {
//     const template = templates.find((template) => template.id === select.value);

//     parent.jQuery(parent.window).trigger("pre_autosave");
//     data = parent.DOM.getFormData(
//       parent.document.querySelector(`form[method="post"]`)
//     );
//     data.__mode = "open_ai_generate_source";
//     data.open_ai_id = select.value;
//     const formData = new FormData();
//     Object.keys(data).forEach((key) => {
//       formData.append(key, data[key]);
//     });
//     const { result: source } = await (
//       await fetch(parent.CMSScriptURI, {
//         method: "POST",
//         body: formData,
//       })
//     ).json();

//     const dom = new DOMParser().parseFromString(source, "image/svg+xml");
//     const promises = [...dom.querySelectorAll("img, image")].map(($image) => {
//       const img = new Image();
//       img.src = $image.getAttribute("href")!;
//       return new Promise((resolve) => {
//         img.onload = () => {
//           const url = imageToBase64(img, "image/jpeg");
//           $image.setAttribute("href", url);
//           resolve();
//         };
//       });
//     });
//     await Promise.all(promises);
//     const img = new Image();
//     const blob = new Blob([new XMLSerializer().serializeToString(dom)], {
//       type: "image/svg+xml",
//     });
//     img.src = URL.createObjectURL(blob);
//     img.style = "max-width: 100%;";
//     container.innerHTML = "";
//     container.appendChild(img);
//   });
//   select.dispatchEvent(new Event("change"));

//   const name = document.querySelector<HTMLSelectElement>(
//     "#plugin-open-ai-panel input"
//   )!;
//   name.addEventListener("input", () => {
//     if (name.value.length !== 0) {
//       primaryButton.disabled = false;
//       primaryButton.classList.remove("disabled");
//     } else {
//       primaryButton.disabled = true;
//       primaryButton.classList.add("disabled");
//     }
//   });
//   let uploaded = false;
//   primaryButton.addEventListener("click", async (ev) => {
//     const img = container.firstChild as HTMLImageElement;
//     const canvas = document.createElement("canvas");
//     canvas.width = img.naturalWidth;
//     canvas.height = img.naturalHeight;
//     const context = canvas.getContext("2d");
//     context?.drawImage(img, 0, 0);
//     const dataURL = canvas.toDataURL("image/png");
//     const bin = atob(dataURL.replace(/^.*,/, ""));
//     const buffer = new Uint8Array(bin.length);
//     for (let i = 0; i < bin.length; i++) {
//       buffer[i] = bin.charCodeAt(i);
//     }
//     const blob = new Blob([buffer.buffer], {
//       type: "image/png",
//     });

//     const formData = new FormData();
//     formData.append("file", blob, name.value + ".png");
//     formData.append("__mode", "js_upload_file");
//     formData.append("blog_id", parentSearch.get("blog_id")!);
//     formData.append("magic_token", data.magic_token);
//     window.uploadFile(formData, {
//       setError() {},
//       setCancelUpload() {},
//       setProgress() {},
//       setThumbnail(data) {
//         uploaded = true;
//         jQuery('#select_asset input[name="id"]').val(data.id);
//         mainPrimaryButton.disabled = false;
//         mainPrimaryButton.click();
//       },
//       enableEditAsset() {},
//       progressbar: {
//         hide() {},
//       },
//     });
//   });
// })();
