// todo
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("clickbutton");

  if (button) {
    button.addEventListener("click", () => {
      alert("You clicked the button!");
    });
  } else {
    console.error("No Button Found!");
  }
});
