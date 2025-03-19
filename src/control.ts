// initializing button elements
export function buttonElement(innerText: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerText = innerText;
    button.style.fontSize = "15px";
    button.style.backgroundColor = "#00A6ED";
    button.style.color = "black";
    return button;
}