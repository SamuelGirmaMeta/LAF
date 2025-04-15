import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getDatabase, ref as dbRef, push } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";
import { moderateContent, banUser, CheckAndEnforce } from './scripts/moderation.js';
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
const storage = getStorage(app);

const content = document.getElementById("content");

/**
 * Extract keywords from a given text string.
 * This function normalizes the text, removes punctuation,
 * splits it into words, and filters out common stop words.
 *
 * @param {string} text The text to extract keywords from.
 * @returns {Array<string>} Array of keywords.
 */
function extractKeywords(text) {
  // Normalize the text: convert to lowercase and apply Unicode normalization.
  // Note: Ensure your environment supports Unicode normalization.
  text = text.toLowerCase().normalize("NFKD");

  // Remove punctuation and digits using a Unicode-aware regex.
  // This regex matches any punctuation or digit character.
  text = text.replace(/[\p{P}\p{N}]+/gu, ' ');

  // Split the text into words on whitespace and filter out empty strings.
  const words = text.split(/\s+/).filter(Boolean);

  // Extended list of common English stop words.
  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
    'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could',
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
    'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
    'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
    'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
    'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  // Build a frequency map for words not in the stop words list.
  const frequencyMap = new Map();
  for (const word of words) {
    if (!stopWords.has(word)) {
      frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
    }
  }

  // Convert the frequency map into a sorted array of objects.
  // Sorting by frequency in descending order.
  const keywords = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));

  return keywords;
}
function renderPostForm() {
  content.innerHTML = `
    <form id="post-form">
      <input type="text" id="title" placeholder="Item title" required>
      <textarea id="description" placeholder="Description" required></textarea>
      <select id="category" required>
        <option value="" disabled selected>Choose category</option>
        <option value="Electronics">Electronics</option>
        <option value="Clothing">Clothing</option>
        <option value="Documents">Documents</option>
        <option value="Accessories">Accessories</option>
        <option value="Others">Others</option>
      </select>
      
      <input type="file" id="imageFiles" multiple accept="image/*">
<p><small>You don't have an image? Use our AI to get one! </small><a href="generate.html" target="_blank">Here!</a></p>
      <div id="progress-container" style="display:none; margin:10px 0;">
        <progress id="progress-bar" value="0" max="100" style="width:100%;"></progress>
        <span id="progress-percent">0%</span>
      </div>
      <button type="submit" id="post-button">Post Item</button>
    </form>
    <div id="message"></div>
  `;

  const form = document.getElementById("post-form");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");
  // Your existing form submission event listener
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const category = document.getElementById("category").value;
    const filesInput = document.getElementById("imageFiles");
    const postButton = document.getElementById("post-button");
    postButton.disabled = true;
  
    // Show progress container when there is at least one file.
    if (filesInput.files.length > 0) {
      progressContainer.style.display = "block";
      progressBar.value = 0;
      progressPercent.textContent = "0%";
    }
  
    // Function to upload a file and return its download URL with progress tracking.
    function uploadFile(file, index, progressArray) {
      return new Promise((resolve, reject) => {
        const fileRef = storageRef(storage, `images/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressArray[index] = progress;
            const avgProgress =
              progressArray.reduce((sum, p) => sum + p, 0) / progressArray.length;
            progressBar.value = avgProgress;
            progressPercent.textContent = `${Math.floor(avgProgress)}%`;
          },
          (error) => {
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    }
  
    try {
      let images = [];
      if (filesInput.files.length > 0) {
        const files = Array.from(filesInput.files);
        const progressArray = new Array(files.length).fill(0);
        const uploadPromises = files.map((file, index) => uploadFile(file, index, progressArray));
        images = await Promise.all(uploadPromises);
  
        // Process each image URL to remove query arguments (everything from the "?" onward).
        // This helps ensure that the OpenAI Moderation API can download the image.
        images = images.map(imageUrl => {
          try {
            // Attempt to remove query parameters using the URL API.
            const urlObj = new URL(imageUrl);
            urlObj.search = "";
            return urlObj.toString();
          } catch (error) {
            // If URL parsing fails, fall back to manual string splitting.
            return imageUrl.split('?')[0];
          }
        });
  
        // Build the input array for OpenAI Moderation API.
        const inputs = images.map((imageUrl) => ({
          type: "image_url",
          image_url: { url: imageUrl }
        }));
  
        // Prepare the payload for OpenAI Moderation.
        const payload = {
          model: "omni-moderation-latest",
          input: inputs
        };
  
        // Call the OpenAI Moderation API.
        const modResponse = await fetch("https://api.openai.com/v1/moderations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer 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"
          },
          body: JSON.stringify(payload)
        });
        const modData = await modResponse.json();
  
        /*
          Expected structure of modData.results:
          [
            {
              flagged: boolean (may be undefined),
              categories: { nudity: boolean, ... },
              category_scores: {...},
              category_applied_input_types: {...}
            },
            ...
          ]
        */
        modData
          if (modData && modData.results && modData.results.length > 0) {
          for (const result of modData.results) {
            // If result.flagged is undefined, fall back to checking the "nudity" category.
            let flagged = result.flagged;
            if (flagged === undefined && result.categories) {
              flagged = result.categories.nudity === true;
            }
            if (flagged === true) {
              alert("One or more images contain inappropriate content (e.g., nudity). You are being banned from the platform.");
              await banUser(auth.currentUser.uid);
              postButton.disabled = false;
              return;
            }
          }
        }
      }
      
      // Create a combined text for keyword extraction.
      const combinedText = title + " " + description;
      const keywords = extractKeywords(combinedText);
  
      // Push new post to the Realtime Database under "posts".
      await push(dbRef(db, "posts"), {
        title,
        description,
        category,
        images,
        keywords,
        uid: auth.currentUser.uid,
        timestamp: Date.now()
      });
      document.getElementById("message").innerText = "Post successfully added!";
      form.reset();
      progressContainer.style.display = "none";
      window.location.href = "MyPosts.html";
    } catch (error) {
      document.getElementById("message").innerText = "Error: " + error.message;
      console.error("Error adding post", error);
      progressContainer.style.display = "none";
    }
    postButton.disabled = false;
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const isBanned = await CheckAndEnforce(user.uid);
    if (isBanned) return;

    renderPostForm();
  } else {
    document.location.href = "index.html";
    content.innerHTML = `
      <p>You must be logged in to post an item.</p>
      <p><a href="#" id="login-link">Click here to log in.</a></p>
    `;

    document.getElementById("login-link").addEventListener("click", () => {
      const email = prompt("Enter your email:");
      const password = prompt("Enter your password:");
      if (email && password) {
        signInWithEmailAndPassword(auth, email, password)
          .catch(error => {
            alert("Login error: " + error.message);
          });
      }
    });
  }
});
