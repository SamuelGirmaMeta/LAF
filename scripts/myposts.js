import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getDatabase, ref, query, orderByChild, equalTo, onValue, remove } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { CheckAndEnforce } from './scripts/moderation.js';
// Your Firebase configuration – update with your project details
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
const auth = getAuth(app);
const db = getDatabase(app);

const postsContainer = document.getElementById("posts-container");

// Function to render a single post item with a delete button
function renderPost(postKey, postData) {
  const postDiv = document.createElement("div");
  postDiv.className = "post-item";
  
  // Build HTML for the post
  postDiv.innerHTML = `
    <h3 class="post-title">${postData.title}</h3>
    <p class="post-description">${postData.description.substring(0, 100)}${postData.description.length > 100 ? "..." : ""}</p>
    <p class="post-category"><strong>Category:</strong> ${postData.category}</p>
    <small class="post-timestamp">${new Date(postData.timestamp).toLocaleString()}</small>
    <button class="delete-btn" data-key="${postKey}">Delete Post</button>
  `;
  
  // Attach event listener for deletion
  const deleteBtn = postDiv.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => deletePost(postKey));
  
  return postDiv;
}

// Function to delete a post
function deletePost(postKey) {
  if (confirm("Are you sure you want to delete this post?")) {
    const postRef = ref(db, "posts/" + postKey);
    remove(postRef)
      .then(() => {
        alert("Post deleted successfully!");
      })
      .catch((error) => {
        alert("Error deleting post: " + error.message);
      });
  }
}

// Listen for authentication state changes
onAuthStateChanged(auth,async (user) => {
  if (user) {
    
    const isBanned = await CheckAndEnforce(user.uid);
    if (isBanned) return;

    // Query posts where uid equals the current user's uid
    const userPostsQuery = query(
      ref(db, "posts"),
      orderByChild("uid"),
      equalTo(user.uid)
    );
    
    onValue(userPostsQuery, (snapshot) => {
      postsContainer.innerHTML = "";
      if (!snapshot.exists()) {
        postsContainer.innerHTML = "<p class='loading'>You have no posts.</p>";
        return;
      }
      
      snapshot.forEach((childSnapshot) => {
        const postKey = childSnapshot.key;
        const postData = childSnapshot.val();
        const postElement = renderPost(postKey, postData);
        postsContainer.appendChild(postElement);
      });
    }, (error) => {
      postsContainer.innerHTML = "<p class='loading'>Error loading posts.</p>";
      console.error("Error loading posts:", error);
    });
  } else {
    document.location.href = "index.html";
    postsContainer.innerHTML = "<p class='loading'>Please log in to view your posts.</p>";
  }
});
