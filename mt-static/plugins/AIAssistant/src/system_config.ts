function enableApiKeyEdit() {
  const input = document.querySelector<HTMLInputElement>(
    "#ai_assistant_api_key"
  ) as HTMLInputElement;
  input.type = "text";
  input.disabled = false;
}

const editButton = document.querySelector("#edit_ai_assistant_api_key");
if (editButton) {
  editButton.addEventListener("click", (e) => {
    (e.currentTarget as HTMLButtonElement).closest(".form-static")?.remove();
    enableApiKeyEdit();
  });
} else {
  enableApiKeyEdit();
}
