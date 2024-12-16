document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://127.0.0.1:5000/paintings';
    let paintings = [];
    let displayedPaintings = [];
    let currentIndex = 0;
    const scene = document.querySelector('a-scene');
    const camera = document.querySelector('#camera');

    const searchOverlay = document.getElementById('search-overlay');
    const searchInputField = document.getElementById('search-input-field');
    const searchSubmitButton = document.getElementById('search-submit-button');
    const sortSelect = document.getElementById('sort-select');

    const instructionsPanel = document.querySelector('#instructions-panel');
    const gotItButton = document.querySelector('#got-it-button');

    // Dismiss instructions panel on 'Got it' click/gaze
    gotItButton.addEventListener('click', () => {
        instructionsPanel.setAttribute('visible', 'false');
    });

    // Camera positions
    const cameraPositions = [
        { position: { x: 0, y: 1.6, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: 0, y: 1.6, z: 0.5 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: 0, y: 1.6, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: 2, y: 1.3, z: 0.1 }, rotation: { x: 0, y: 45, z: 0 } },
        { position: { x: 0, y: 1.6, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: -2, y: 1.3, z: 0.1 }, rotation: { x: 0, y: -45, z: 0 } },
        { position: { x: 0, y: 1.6, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
        { position: { x: 0, y: 1.6, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
        // Custom position for the search overlay viewpoint:
        { position: { x: 0, y: 1.3, z: 4 }, rotation: { x: -45, y: 0, z: 0 } }
    ];
    let currentPositionIndex = 0;
    let cameraMovementEnabled = false;
    camera.setAttribute('look-controls', 'enabled: false');

    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            paintings = data;
            displayedPaintings = [...paintings];
            displayPainting(currentIndex);
            setupSearchPanel();
            document.addEventListener('keydown', handleKeyNavigation);
        })
        .catch(error => console.error('Error fetching paintings:', error));

    function displayPainting(index) {
        if (displayedPaintings.length === 0) return;
        const painting = displayedPaintings[index];

        const existingPainting = document.querySelector('.painting');
        if (existingPainting) existingPainting.remove();

        const img = new Image();
        img.src = painting.imageUrl;
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const maxWidth = 4, maxHeight = 3;
            const planeWidth = aspectRatio > 1 ? maxWidth : maxHeight * aspectRatio;
            const planeHeight = aspectRatio > 1 ? maxWidth / aspectRatio : maxHeight;

            const paintingPlane = document.createElement('a-plane');
            paintingPlane.setAttribute('class', 'painting');
            paintingPlane.setAttribute('src', painting.imageUrl);
            paintingPlane.setAttribute('width', planeWidth);
            paintingPlane.setAttribute('height', planeHeight);
            paintingPlane.setAttribute('position', '0 1.6 -2');
            paintingPlane.setAttribute('material', 'shader: standard; side: double;');
            scene.appendChild(paintingPlane);
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${painting.imageUrl}`);
        };

        updateDetails(painting.title, painting.artist, painting.year);
    }

    // Updated updateDetails function with consistent scaling and spacing
    function updateDetails(title, artist, yearRange) {
        // Year formatting
        let formattedYears = "";
        if (yearRange && /^\d{8}$/.test(yearRange)) {
            const birthYear = yearRange.slice(0,4);
            const deathYear = yearRange.slice(4,8);
            formattedYears = `${birthYear}–${deathYear}`;
        } else {
            formattedYears = yearRange || "";
        }

        let artistLine = `by ${artist}`;
        if (formattedYears) {
            artistLine += ` (${formattedYears})`;
        }

        let infoPanel = document.querySelector('#info-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('a-plane');
            infoPanel.setAttribute('id', 'info-panel');
            infoPanel.setAttribute('color', '#f0f0f0');
            infoPanel.setAttribute('width', '3');
            infoPanel.setAttribute('height', '1.25');
            infoPanel.setAttribute('position', '0 -0.8 -2');
            infoPanel.setAttribute('material', 'side:double; shader:flat;');
            scene.appendChild(infoPanel);
        }

        // Clear old text
        const existingTexts = infoPanel.querySelectorAll('a-text');
        existingTexts.forEach(el => el.remove());

        // Title text
        const titleText = document.createElement('a-text');
        titleText.setAttribute('value', title);
        titleText.setAttribute('align', 'center');
        titleText.setAttribute('color', '#333');
        titleText.setAttribute('position', `0 0.35 0.01`);
        titleText.setAttribute('width', '2.5');
        infoPanel.appendChild(titleText);

        // Artist text
        const artistTextNode = document.createElement('a-text');
        artistTextNode.setAttribute('value', artistLine);
        artistTextNode.setAttribute('align', 'center');
        artistTextNode.setAttribute('color', '#555');
        artistTextNode.setAttribute('position', `0 0 0.01`);
        artistTextNode.setAttribute('width', '2.5');
        infoPanel.appendChild(artistTextNode);
    }

    function handleKeyNavigation(event) {
        if (searchOverlay.style.display === 'flex') {
            return; // If overlay is open, ignore navigation
        }

        if (event.key === ' ') {
            cameraMovementEnabled = !cameraMovementEnabled;
            camera.setAttribute('look-controls', `enabled: ${cameraMovementEnabled}`);
        } else if (!cameraMovementEnabled) {
            if (event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') {
                currentPositionIndex = (currentPositionIndex + 1) % cameraPositions.length;
                moveToPosition(cameraPositions[currentPositionIndex]);
            } else if (event.key.toLowerCase() === 's' || event.key === 'ArrowDown') {
                currentPositionIndex = (currentPositionIndex - 1 + cameraPositions.length) % cameraPositions.length;
                moveToPosition(cameraPositions[currentPositionIndex]);
            } else if (event.key === 'a' || event.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + displayedPaintings.length) % displayedPaintings.length;
                displayPainting(currentIndex);
            } else if (event.key === 'd' || event.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % displayedPaintings.length;
                displayPainting(currentIndex);
            } else if (event.key.toLowerCase() === 'i') {
                goToSearchPanel();
            }
        }
    }

    function goToSearchPanel() {
        const searchPositionIndex = 9; // Updated index for your custom search position if needed
        moveToPosition(cameraPositions[searchPositionIndex]);
        setTimeout(() => {
            openSearchOverlay();
        }, 1000);
    }

    function setupSearchPanel() {
        searchSubmitButton.addEventListener('click', () => {
            const searchTerm = searchInputField.value.trim().toLowerCase();
            closeSearchOverlay();

            if (!searchTerm) {
                displayedPaintings = [...paintings];
            } else {
                displayedPaintings = paintings.filter(p =>
                    p.title.toLowerCase().includes(searchTerm) ||
                    p.artist.toLowerCase().includes(searchTerm)
                );
            }

            const sortValue = sortSelect.value;
            applySorting(sortValue);

            currentIndex = 0;
            if (displayedPaintings.length === 0) {
                alert('No paintings found for the given search term.');
            } else {
                displayPainting(currentIndex);
            }
        });
    }

    function applySorting(sortValue) {
        switch (sortValue) {
            case 'title-asc':
                displayedPaintings.sort((a,b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                displayedPaintings.sort((a,b) => b.title.localeCompare(a.title));
                break;
            case 'artist-asc':
                displayedPaintings.sort((a,b) => a.artist.localeCompare(b.artist));
                break;
            case 'artist-desc':
                displayedPaintings.sort((a,b) => b.artist.localeCompare(a.artist));
                break;
            case 'year-asc':
                displayedPaintings.sort((a,b) => (a.year || Infinity) - (b.year || Infinity));
                break;
            case 'year-desc':
                displayedPaintings.sort((a,b) => (b.year || -Infinity) - (a.year || -Infinity));
                break;
            default:
                // No sorting
                break;
        }
    }

    function openSearchOverlay() {
        searchInputField.value = '';
        searchOverlay.style.display = 'flex';
        searchInputField.focus();
    }

    function closeSearchOverlay() {
        searchOverlay.style.display = 'none';
    }

    function moveToPosition(target) {
        const targetPos = target.position;
        const targetRot = target.rotation;

        const currentPos = camera.getAttribute('position');
        new TWEEN.Tween(currentPos)
            .to(targetPos, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.setAttribute('position', currentPos);
            })
            .start();

        const currentRot = camera.getAttribute('rotation');
        new TWEEN.Tween(currentRot)
            .to(targetRot, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.setAttribute('rotation', currentRot);
            })
            .start();
    }

    function animate() {
        requestAnimationFrame(animate);
        TWEEN.update();
    }
    animate();
});
