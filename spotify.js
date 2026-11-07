const spotifyToggle = document.querySelector("#spotify-toggle");
const spotifyToggleLabel = document.querySelector("#spotify-toggle-label");
const spotifyPanel = document.querySelector("#spotify-panel");
const spotifyFrame = document.querySelector("#spotify-frame");

spotifyToggle.addEventListener("click", () => {
    const opening = spotifyPanel.hidden;
    spotifyPanel.hidden = !opening;
    spotifyToggle.setAttribute("aria-expanded", String(opening));
    spotifyToggle.title = opening ? "Close Spotify playlist" : "Open Spotify playlist";
    spotifyToggleLabel.textContent = opening ? "CLOSE SPOTIFY" : "SPOTIFY";
    document.body.classList.toggle("spotify-open", opening);
    if (opening) {
        spotifyFrame.src = spotifyFrame.dataset.src;
    } else {
        spotifyFrame.removeAttribute("src");
    }
});