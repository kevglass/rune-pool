

if (!window.parentDoc) {
  window.parentDoc = window.parent.document
 
  // // set the background to white
  window.parentDoc.body.style.background = "#FFF"
  // remove the top bar
  window.parentDoc
    .getElementById("root")
    .childNodes[0].childNodes[1].childNodes[0].remove()
  // remove the user name
  if (
    window.parentDoc.getElementById("root").childNodes[0].childNodes[1]
      .childNodes[0]
  ) {
    window.parentDoc
      .getElementById("root")
      .childNodes[0].childNodes[1].childNodes[0].childNodes[0].childNodes[1].remove()
  }
  setTimeout(() => {
    const iframe = window.parentDoc.getElementsByTagName("iframe")[0]
    if (iframe.parentNode !== window.parentDoc.body) {
      iframe.style.position = "absolute"
      iframe.style.top = "0"
      iframe.style.left = "0"

      iframe.parentNode.removeChild(iframe)
      window.parentDoc.body.appendChild(iframe)
    }
  }, 1)
}

setTimeout(() => {
  const overlay = document.getElementById("loading")
  if (overlay) {
    overlay.parentNode.removeChild(overlay)
  }
}, 1000)
