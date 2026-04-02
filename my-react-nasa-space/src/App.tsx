import { useEffect, useState, memo } from "react";
import "./App.css";

const API_KEY = "g76hVcaEXILjaze9OjeoqOEyL22giOO59mKaHP0h";

//функція для локальної дати
const getToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

// TYPES
interface Photo {
  id: any;
  img_src: string;
  earth_date: string;
  rover: { name: string };
  camera: { full_name: string };
}

interface Apod {
  title: string;
  url: string;
  explanation: string;
  date: string;
}

type Page = "home" | "explore" | "favorites";

type NasaImage = {
  nasa_id: string;
  title: string;
  description: string;
  url: string;
  date?: string;
};

// PHOTO CARD 
const PhotoCard = memo(
  ({
    photo,
    onLike,
    isFav,
    onClick,
  }: {
    photo: Photo;
    onLike: (p: Photo) => void;
    isFav: boolean;
    onClick?: () => void;
  }) => (
    <div className={`card fade-in ${isFav ? "fav-card" : ""}`}>
      <img src={photo.img_src} alt={photo.camera.full_name} onClick={onClick} />
      <div className="overlay">
        <button
          className={`like-btn ${isFav ? "liked" : ""}`}
          onClick={() => onLike(photo)}
        >
          {isFav ? "★" : "☆"}
        </button>
        <div className="info">
          <span>{photo.camera.full_name || photo.rover.name}</span>
          <span>{photo.earth_date}</span>
        </div>
      </div>
    </div>
  )
);

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const [apod, setApod] = useState<Apod | null>(null);

  const [date, setDate] = useState(getToday());

  const [favorites, setFavorites] = useState<Photo[]>([]);

  // EXPLORE STATE 
  const [search, setSearch] = useState("galaxy");
  const [results, setResults] = useState<NasaImage[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sortOption, setSortOption] = useState<
    "date-asc" | "date-desc" | "title-asc" | "title-desc"
  >("date-desc");
  const [idFilter, setIdFilter] = useState("");
  const [filterType, setFilterType] = useState<"none" | "id">("none");

  // MODAL 
  const [selectedImage, setSelectedImage] = useState<null | {
    url: string;
    title: string;
    description?: string;
  }>(null);

  // LOCK SCROLL WHEN MODAL OPEN
  useEffect(() => {
    document.body.style.overflow = selectedImage ? "hidden" : "auto";
  }, [selectedImage]);

  // APOD (календар aka фото дня)
  const fetchApod = async (selectedDate?: string) => {
    try {
      const today = getToday();

      const res = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}${
          selectedDate ? `&date=${selectedDate}` : ""
        }`
      );

      const data = await res.json();

      // fallback (забезпечує відображення сторінки, якщо браузер не підтримує нові функції)
      if (!data.url) {
        return fetchApod(today);
      }

      setApod(data);
    } catch (e) {
      console.error(e);
    }
  };

  //календар
  useEffect(() => {
    if (date) {
      fetchApod(date);
    }
  }, [date]);

  // SEARCH 
  const fetchSearch = async (query: string, page: number) => {
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `https://images-api.nasa.gov/search?q=${query}&media_type=image&page=${page}`
      );
      const data = await res.json();
      const parsed = data.collection.items
        .map((item: any) => {
          const d = item.data[0];
          const img = item.links?.[0]?.href;
          if (!img) return null;
          return {
            nasa_id: d.nasa_id,
            title: d.title,
            description: d.description,
            url: img,
            date: d.date_created,
          };
        })
        .filter(Boolean);
      setResults(parsed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  };

  // INIT (ініціалізація)
  useEffect(() => {
    const saved = localStorage.getItem("favs");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // SAVE FAVS 
  useEffect(() => {
    localStorage.setItem("favs", JSON.stringify(favorites));
  }, [favorites]);

  // DEBOUNCE SEARCH (пошук із затримкою)
  useEffect(() => {
    const t = setTimeout(() => fetchSearch(search, pageNum), 500);
    return () => clearTimeout(t);
  }, [search, pageNum]);

  //scroll to top при зміні сторінки
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pageNum]);

  // TOGGLE FAVORITE (перемикання вибраного)
  const toggleFav = (p: Photo) => {
    setFavorites((prev) =>
      prev.find((f) => f.id === p.id)
        ? prev.filter((f) => f.id !== p.id)
        : [...prev, p]
    );
  };

  // SORT + FILTER 
  const displayedResults = [...results]
    .filter((item) =>
      filterType === "id"
        ? item.nasa_id.toLowerCase().includes(idFilter.toLowerCase())
        : true
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "date-asc":
          return (a.date || "").localeCompare(b.date || "");
        case "date-desc":
          return (b.date || "").localeCompare(a.date || "");
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    // pagination logic
  const getPages = () => {
    const maxVisible = 5;
    const pages = [];

    let start = Math.max(1, pageNum - 2);
    let end = start + maxVisible - 1;

    if (pageNum <= 3) {
      start = 1;
      end = maxVisible;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  //today (календар)
  const today = getToday();

  return (
    <div className="app">
      {/* TABS */}
      <div className="tabs">
        <button onClick={() => setPage("home")}>Home</button>
        <button onClick={() => setPage("explore")}>Explore</button>
        <button onClick={() => setPage("favorites")}>Favorites</button>
      </div>

      {/* HOME */}
      {page === "home" && apod && (
        <div
          className="apod-full"
          style={{ backgroundImage: `url(${apod.url})` }}
        >
          <div className="overlay-dark" />
          <div className="apod-content">
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
            {date > today && (
              <span className="warning">Cannot select future date</span>
            )}
            <h1>{apod.title}</h1>
            <p>{apod.explanation}</p>
            <span>{apod.date}</span>
          </div>
        </div>
      )}

      {/* EXPLORE */}
      {page === "explore" && (
        <div className="section">
          <h2>Explore Space</h2>

          <div className="search-sort-row">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageNum(1);
              }}
              placeholder="Search galaxy, nebula, mars, moon..."
              list="suggestions"
            />

            <datalist id="suggestions">
              {[
                "galaxy",
                "nebula",
                "mars",
                "moon",
                "saturn",
                "jupiter",
                "comet",
                "asteroid",
                "supernova",
              ].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            {/* FILTER DROPDOWN */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="none">No Filter</option>
              <option value="id">Filter by ID</option>
            </select>

            {filterType === "id" && (
              <input
                type="text"
                placeholder="Enter ID..."
                value={idFilter}
                onChange={(e) => setIdFilter(e.target.value)}
              />
            )}

            <select
              onChange={(e) => setSortOption(e.target.value as any)}
              value={sortOption}
            >
              <option value="date-desc">Date Desc</option>
              <option value="date-asc">Date Asc</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>

          {loadingSearch && <p>Searching...</p>}

          <div className="grid">
            {displayedResults.map((item) => (
              <div key={item.nasa_id} className="card fade-in">
                <img
                  src={item.url}
                  onClick={() =>
                    setSelectedImage({
                      url: item.url,
                      title: item.title,
                      description: item.description,
                    })
                  }
                />

                <div className="overlay">
                  <button
                    className={`like-btn ${
                      favorites.find((f) => f.id === item.nasa_id)
                        ? "liked"
                        : ""
                    }`}
                    onClick={() =>
                      setFavorites((prev) =>
                        prev.find((f) => f.id === item.nasa_id)
                          ? prev
                          : [
                              ...prev,
                              {
                                id: item.nasa_id,
                                img_src: item.url,
                                earth_date: item.date || "",
                                rover: { name: item.description },
                                camera: { full_name: item.title },
                              },
                            ]
                      )
                    }
                  >
                    {favorites.find((f) => f.id === item.nasa_id)
                      ? "★"
                      : "☆"}
                  </button>

                  <div className="info">
                    <span>{item.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button disabled={pageNum === 1} onClick={() => setPageNum((p) => p - 1)}>
              Prev
            </button>

            {pageNum > 3 && (
              <>
                <button onClick={() => setPageNum(1)}>1</button>
                <span>...</span>
              </>
            )}
            
            {getPages().map((p) => (
              <button 
                key={p}
                className={p === pageNum ? "active-page" : ""}
                disabled={p === pageNum} //неактивна сторінка якщо ми на ній знаходимось
                onClick={() => setPageNum(p)}
              >
                {p}
              </button>
            ))}

            {/* disable - якщо нема результатів */}
            {displayedResults.length > 0 && (
              <>
                <span>...</span>
                <button 
                  disabled={displayedResults.length === 0}
                  onClick={() => setPageNum(pageNum + 5)}
                >
                  {pageNum + 5}
                </button>
              </>
            )}

            <button
              disabled={displayedResults.length === 0}
              onClick={() => setPageNum((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* FAVORITES */}
      {page === "favorites" && (
        <div className="section">
          <h2>Favorites</h2>
          <div className="grid">
            {favorites.map((p) => (
              <PhotoCard
                key={p.id}
                photo={p}
                onLike={toggleFav}
                isFav={true}
                onClick={() =>
                  setSelectedImage({
                    url: p.img_src,
                    title: p.camera.full_name,
                    description: p.rover.name,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>

            <img src={selectedImage.url} />
            <h2>{selectedImage.title}</h2>
            {selectedImage.description && <p>{selectedImage.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
