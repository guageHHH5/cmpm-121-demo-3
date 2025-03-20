// initializing button elements
export function buttonElement(innerText: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerText = innerText;
    button.style.fontSize = "15px";
    button.style.backgroundColor = "#00A6ED";
    button.style.color = "black";
    return button;
}

// adding inventory panel elements, aka coin elements
export function createInventoryPanel(): HTMLDivElement {
    const invPanel = document.createElement("div");

    invPanel.style.position = "absolute";
    invPanel.style.top = "50%";
    invPanel.style.left = "50%";
    invPanel.style.transform = "translate(-50%, -50%)";
    invPanel.style.backgroundColor = "rgba(0,0,0,0.8)";
    invPanel.style.padding = "10px";
    invPanel.style.borderRadius = "10px";
    invPanel.style.zIndex = "1000";
    invPanel.style.color = "black";
    invPanel.style.backgroundColor = "white";
    invPanel.style.width = "400px";
    invPanel.style.height = "300px";
    invPanel.style.display = "flex";
    invPanel.style.flexDirection = "column";
    invPanel.style.justifyContent = "space-between";
    return invPanel;
}

export function createCoinContainerDiv(): HTMLDivElement {
    const coinContainerDiv = document.createElement("div");
    coinContainerDiv.style.flex = "1";
    coinContainerDiv.style.overflowY = "auto";
    coinContainerDiv.style.marginBottom = "10px";
    return coinContainerDiv;
}

export function createCloseButtonDiv(): HTMLDivElement {
    const closeButtonDiv = document.createElement("div");
    closeButtonDiv.style.display = "flex";
    closeButtonDiv.style.justifyContent = "center";
    return closeButtonDiv;
}

export function createCoinButton(innerText: string): HTMLButtonElement {
    const coinButton = document.createElement("button");
    coinButton.innerText = innerText;
    coinButton.style.fontSize = "15px";
    coinButton.style.backgroundColor = "#00A6ED";
    coinButton.style.color = "black";
    return coinButton;
}