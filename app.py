from flask import Flask, jsonify, render_template
import requests
from flask_caching import Cache
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

# Cache configuration
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 3600
cache = Cache(app)

AIC_SEARCH_URL = "https://api.artic.edu/api/v1/artworks/search"
AIC_ARTWORK_URL = "https://api.artic.edu/api/v1/artworks"
PLACEHOLDER_IMAGE = "https://via.placeholder.com/800x1200.png?text=No+Image"

# Preload paintings once
@cache.cached(key_prefix="paintings_data")
def load_paintings():
    # A broad query to get a variety of paintings with images
    params = {
        "q": "painting",
        "limit": 10
    }

    response = requests.get(AIC_SEARCH_URL, params=params)
    response.raise_for_status()
    data = response.json()
    artworks = data.get('data', [])

    def fetch_artwork_details(artwork):
        artwork_id = artwork.get('id')
        if not artwork_id:
            return None
        detail_url = f"{AIC_ARTWORK_URL}/{artwork_id}"
        detail_res = requests.get(detail_url)
        if detail_res.status_code == 200:
            detail_data = detail_res.json().get('data', {})
            title = detail_data.get('title', 'Untitled')
            artist = detail_data.get('artist_display', 'Unknown')
            image_id = detail_data.get('image_id')
            date_start = detail_data.get('date_start')  # Might be None if not available

            if image_id:
                image_url = f"https://www.artic.edu/iiif/2/{image_id}/full/400,/0/default.jpg"
            else:
                image_url = PLACEHOLDER_IMAGE

            return {
                "title": title,
                "artist": artist,
                "imageUrl": image_url,
                "year": date_start if date_start else None
            }
        return None

    with ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(fetch_artwork_details, artworks))

    paintings = [r for r in results if r is not None]
    return paintings

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/paintings', methods=['GET'])
def get_paintings():
    # Return the preloaded paintings
    paintings = load_paintings()
    return jsonify(paintings)

if __name__ == '__main__':
    app.run(debug=True)
