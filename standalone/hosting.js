// prevent accidental multiple includsions
if (!window.parentDoc) {
  window.parentDoc = window.parent.document

  // set the background to white
  window.parentDoc.body.style.background = "#FFF"
  // remove the top bar
  window.parentDoc
    .getElementById("root")
    .childNodes[0].childNodes[1].childNodes[0].remove()
  // remove the user name
  window.parentDoc
    .getElementById("root")
    .childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[1].remove()
}
