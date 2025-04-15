import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getDatabase, ref as dbRef, get } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { CheckAndEnforce } from "./moderation.js";
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6-7STiFMEsdZleFSwSmopvdVj1z_ymx4",
  authDomain: "slms-f83ea.firebaseapp.com",
  databaseURL: "https://slms-f83ea-default-rtdb.firebaseio.com",
  projectId: "slms-f83ea",
  storageBucket: "slms-f83ea.appspot.com",
  messagingSenderId: "777069330071",
  appId: "1:777069330071:web:24c4705c6011214ce6b3d2",
  measurementId: "G-QDBTHP5SDS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const searchIcon = document.getElementById("search-icon");
const searchPanel = document.getElementById("search-panel");
const searchButton = document.getElementById("search-button");
const resultsContainer = document.getElementById("results-container");

// Toggle search panel visibility when the magnifier icon is clicked
searchIcon.addEventListener("click", () => {
  searchPanel.classList.toggle("active");
});

// Utility function to extract keywords from a text string
function extractKeywords(text) {
  text = text.toLowerCase();
  text = text.replace(/[^\w\s]/g, "");
  return text.split(/\s+/).filter(word => word.length > 0);
}

// Compute a ranking score based on matching keywords
function computeScore(searchKeywords, postKeywords) {
  let score = 0;
  for (const keyword of searchKeywords) {
    if (postKeywords.includes(keyword)) {
      score++;
    }
  }
  return score;
}

// When search button is clicked, perform the search
searchButton.addEventListener("click", async () => {
  const keywordInput = document.getElementById("keyword").value.trim();
  const categoryInput = document.getElementById("category").value;
  const startDateInput = document.getElementById("start-date").value;
  const endDateInput = document.getElementById("end-date").value;
  
  const searchCriteria = {
    keyword: keywordInput,
    category: categoryInput,
    start: startDateInput,
    end: endDateInput
  };

  console.log("Search criteria:", searchCriteria);

  // Retrieve all posts from Firebase under "posts"
  const postsRef = dbRef(db, "posts");
  const snapshot = await get(postsRef);
  let results = [];
  
  if (snapshot.exists()) {
    const posts = snapshot.val();
    for (const id in posts) {
      const post = posts[id];

      // Filter by category if provided
      if (searchCriteria.category && post.category !== searchCriteria.category) {
        continue;
      }

      // Filter by date range if provided (post.timestamp is assumed to be in milliseconds)
      if (searchCriteria.start) {
        const startTimestamp = new Date(searchCriteria.start).getTime();
        if (post.timestamp < startTimestamp) continue;
      }
      if (searchCriteria.end) {
        const endTimestamp = new Date(searchCriteria.end).getTime();
        if (post.timestamp > endTimestamp) continue;
      }

      // Calculate score based on matching keywords (if a keyword search is provided)
      let score = 0;
      if (searchCriteria.keyword) {
        const searchKeywords = extractKeywords(searchCriteria.keyword);
        const postKeywords = post.keywords || [];
        score = computeScore(searchKeywords, postKeywords);
      }
      // Skip if a keyword is provided but there is no match
      if (searchCriteria.keyword && score === 0) continue;

      results.push({ id, ...post, score });
    }
  }

  // Sort results by descending score (more relevant results first)
  results.sort((a, b) => b.score - a.score);
  displayResults(results);
});

// Render search results in a manner similar to the view page
function displayResults(results) {
  resultsContainer.innerHTML = "";
  
  // Header for the results view
  const header = document.createElement("h2");
  header.textContent = "Search Results";
  resultsContainer.appendChild(header);

  if (results.length === 0) {
    const noResults = document.createElement("p");
    noResults.textContent = "No matching posts found. Adjust your search criteria and try again.";
    noResults.style.fontStyle = "italic";
    noResults.style.color = "#777";
    resultsContainer.appendChild(noResults);
    return;
  }

  // Create a card for each result
  results.forEach(result => {
    const card = document.createElement("div");
    card.className = "post-card";
    card.style.backgroundColor = "hsl(240, 100.00%, 99.80%)";
    card.maxHeight = "95%";
    const title = document.createElement("h3");
    title.textContent = result.title;
    card.appendChild(title);

    const category = document.createElement("p");
    category.textContent = `Category: ${result.category}`;
    card.appendChild(category);

    const description = document.createElement("p");
    description.innerHTML = result.description;
    card.appendChild(description);

    // Include image if available
    if (result.images && result.images.length > 0) {
      const image = document.createElement("img");
      image.src = result.images[0];
      image.alt = result.title;
      image.style.width = "95%";
      image.style.maxHeight = "200px";
      image.style.objectFit = "cover";
      image.style.borderRadius = "8px";
      card.appendChild(image);
    }

    // Append post date
    const date = document.createElement("p");
    date.textContent = `Posted on: ${new Date(result.timestamp).toLocaleDateString()}`;
    card.appendChild(date);
    card.addEventListener("click",e =>{
      window.location.href = "Chat.html?uid="+result.uid;
    });
    resultsContainer.appendChild(card);
  });
}