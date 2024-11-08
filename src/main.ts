// todo
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("button");

  if (button) {
    button.addEventListener("click", () => {
      alert("You clicked the button!");
    });
  } else {
    console.error("Button not found!");
  }
});
