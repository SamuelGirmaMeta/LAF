import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { 
  getDatabase, ref as dbRef, onValue, push, update, get 
} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import { CheckAndEnforce } from './scripts/moderation.js';
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
const auth = getAuth(app);
const db = getDatabase(app);

const conversationListElem = document.getElementById("conversation-list");
const chatWithElem = document.getElementById("chat-with");
const chatMessagesElem = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

let currentUser = null;
let activeConversationId = null;
let activePartnerUid = null;
let messagesListener = null;

// Utility: Get sorted conversation ID from two uids
function getConversationId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Utility: Parse query parameter from URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Render a single message in the chat messages area
function renderMessage(message) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message");
  if (message.sender === currentUser.uid) {
    msgDiv.classList.add("sent");
  }
  const contentDiv = document.createElement("div");
  contentDiv.classList.add("message-content");
  contentDiv.textContent = message.text;
  
  const timeDiv = document.createElement("div");
  timeDiv.classList.add("message-time");
  timeDiv.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  msgDiv.appendChild(contentDiv);
  msgDiv.appendChild(timeDiv);
  
  chatMessagesElem.appendChild(msgDiv);
  chatMessagesElem.scrollTop = chatMessagesElem.scrollHeight;
}

// Load messages for active conversation and update partner's username on first message
function loadMessages(conversationId) {
  if (messagesListener) {
    messagesListener(); // Unsubscribe previous listener
  }
  const convRef = dbRef(db, `chats/${conversationId}`);
  messagesListener = onValue(convRef, (snapshot) => {
    chatMessagesElem.innerHTML = "";
    snapshot.forEach(child => {
      const message = child.val();
      renderMessage(message);
      // If the message is from the partner and we haven't stored their username, update it.
      if (message.sender !== currentUser.uid) {
        get(dbRef(db, `userChats/${currentUser.uid}/${activePartnerUid}/partnerUsername`))
          .then((snap) => {
            if(!snap.exists() || !snap.val()){
              const partnerName = message.username || activePartnerUid;
              const updates = {};
              updates[`userChats/${currentUser.uid}/${activePartnerUid}/partnerUsername`] = partnerName;
              updates[`userChats/${activePartnerUid}/${currentUser.uid}/partnerUsername`] = partnerName;
              update(dbRef(db), updates);
              chatWithElem.textContent = `Chat with ${partnerName}`;
            }
          })
          .catch(err => {
            console.error("Error updating partner username:", err);
          });
      }
    });
  });
}

// Load conversation list for current user from "userChats/{uid}"
function loadConversationList() {
  const userChatsRef = dbRef(db, `userChats/${currentUser.uid}`);
  onValue(userChatsRef, (snapshot) => {
    conversationListElem.innerHTML = "";
    snapshot.forEach(child => {
      const chat = child.val();
      // Use the stored partnerUsername if available; otherwise, fallback to partner UID.
      const partnerDisplayName = chat.partnerUsername || child.key;
      const li = document.createElement("li");
      li.textContent = partnerDisplayName;
      li.addEventListener("click", () => {
        setActiveConversation(child.key, partnerDisplayName);
      });
      if (activePartnerUid === child.key) {
        li.classList.add("active");
      }
      conversationListElem.appendChild(li);
    });
  });
}

// Set active conversation given partner UID and display name
function setActiveConversation(partnerUid, displayName) {
  activePartnerUid = partnerUid;
  activeConversationId = getConversationId(currentUser.uid, partnerUid);
  chatWithElem.textContent = `Chat with ${displayName}`;
  loadMessages(activeConversationId);
  // Update active conversation styling
  Array.from(conversationListElem.children).forEach(li => {
    li.classList.remove("active");
    if (li.textContent === displayName) {
      li.classList.add("active");
    }
  });
}

// Send message with the sender's username attached
sendButton.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text || !activeConversationId) return;
  
  // Include the sender's username (if they set one) or fallback to UID
  const username = currentUser.displayName || currentUser.uid;
  const msg = {
    sender: currentUser.uid,
    text,
    timestamp: Date.now(),
    username: username
  };
  const convRef = dbRef(db, `chats/${activeConversationId}`);
  push(convRef, msg)
    .then(() => {
      messageInput.value = "";
      // Update last message and timestamps in userChats for both users.
      const currentUsername = username;
      const updates = {};
      updates[`userChats/${currentUser.uid}/${activePartnerUid}/lastMessage`] = text;
      updates[`userChats/${activePartnerUid}/${currentUser.uid}/lastMessage`] = text;
      updates[`userChats/${currentUser.uid}/${activePartnerUid}/timestamp`] = Date.now();
      updates[`userChats/${activePartnerUid}/${currentUser.uid}/timestamp`] = Date.now();
      // Update current user's record in the partner's view with our username.
      updates[`userChats/${activePartnerUid}/${currentUser.uid}/partnerUsername`] = currentUsername;
      return update(dbRef(db), updates);
    })
    .catch(err => {
      console.error("Error sending message:", err);
    });
});

// Allow sending message with Enter key
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendButton.click();
  }
});

// On auth state changed, initialize conversation list and set active conversation if provided via query
onAuthStateChanged(auth, async user => {
  if (user) {
    const isBanned = await CheckAndEnforce(user.uid);
    if (isBanned) return;

    currentUser = user;
    loadConversationList();
    const partnerUid = getQueryParam("uid");
    if (partnerUid) {
      // When setting active conversation via query param, use partnerUid as display name initially.
      setActiveConversation(partnerUid, partnerUid);
    }
  } else {
    
    document.location.href = "index.html";
  }
});
