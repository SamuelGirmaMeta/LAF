import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getDatabase, ref, query, orderByChild, onValue } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";

// Firebase configuration
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const postsContainer = document.getElementById("posts-container");
const popupOverlay = document.getElementById("popup-overlay");
const popupContent = document.getElementById("popup-content");
const popupTitle = document.getElementById("popup-title");
const popupDescription = document.getElementById("popup-description");
const popupCategory = document.getElementById("popup-category");
const popupTimestamp = document.getElementById("popup-timestamp");
const popupImagesContainer = document.getElementById("popup-images-container");
const popupClose = document.getElementById("popup-close");

// Utility function to truncate text for preview
function truncateText(text, maxLength) {
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
}

// Open popup with full post details and add a Chat button redirecting to the Chat window with target UID.
function openPopup(post) {
  // Set title
  popupTitle.textContent = post.title;
  // Set full description
  popupDescription.innerHTML = "";
  const descPara = document.createElement("p");
  descPara.textContent = post.description;
  descPara.style.whiteSpace = "pre-wrap";
  popupDescription.appendChild(descPara);
  
  // Set category and timestamp
  popupCategory.innerHTML = `<strong>Category:</strong> ${post.category}`;
  popupTimestamp.textContent = `Posted on: ${new Date(post.timestamp).toLocaleString()}`;
  
  // Populate images in popup
  popupImagesContainer.innerHTML = "";
  if (post.images && post.images.length > 0) {
    post.images.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Post Image";
      img.classList.add("popup-image");
      popupImagesContainer.appendChild(img);
    });
  }
  
  // Remove previous Chat button if it exists
  const existingChatButton = document.getElementById("popup-chat-button");
  if (existingChatButton) {
    existingChatButton.remove();
  }
  
  // Create Chat button that redirects to Chat.html with target UID as a query parameter.
  const chatButton = document.createElement("button");
  chatButton.id = "popup-chat-button";
  chatButton.textContent = "Chat";
  chatButton.style.marginTop = "10px";
  chatButton.addEventListener("click", () => {
    window.location.href = `Chat.html?uid=${post.uid}`;
  });
  
  // Append the Chat button to the popup content, below the rest of the info.
  popupContent.appendChild(chatButton);
  
  // Show popup overlay
  popupOverlay.style.display = "flex";
}

// Close popup when clicking on close button
popupClose.addEventListener("click", () => {
  popupOverlay.style.display = "none";
  // Optionally remove Chat button when closing the popup
  const existingChatButton = document.getElementById("popup-chat-button");
  if (existingChatButton) {
    existingChatButton.remove();
  }
});

// Query and display posts ordered by timestamp
const postsQuery = query(ref(db, "posts"), orderByChild("timestamp"));
onValue(postsQuery, snapshot => {
  let posts = [];
  snapshot.forEach(childSnapshot => {
    posts.push(childSnapshot.val());
  });
  posts.reverse();
  postsContainer.innerHTML = "";
  
  if (posts.length === 0) {
    postsContainer.innerHTML = "<p class='loading'>No posts available.</p>";
  } else {
    posts.forEach(post => {
      const postDiv = document.createElement("div");
      postDiv.className = "post-item";
      
      let thumbnail = "";
      if (post.images && post.images.length > 0) {
        thumbnail = `<div class="post-thumbnail" style="background-image: url('${post.images[0]}');"></div>`;
      }
      
      postDiv.innerHTML = `
        ${thumbnail}
        <div class="post-content">
          <h3 class="post-title">${post.title}</h3>
          <p class="post-description">${truncateText(post.description, 80)}</p>
          <p class="post-category">${post.category}</p>
          <small class="post-timestamp">${new Date(post.timestamp).toLocaleString()}</small>
        </div>
      `;
      
      // Attach click event to the title to open popup with details and chat option.
      postDiv.querySelector(".post-title").addEventListener("click", () => openPopup(post));
      
      postsContainer.appendChild(postDiv);
    });
  }
}, error => {
  postsContainer.innerHTML = "<p class='loading'>Error loading posts.</p>";
  console.error("Error loading posts:", error);
});