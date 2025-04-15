// Import the necessary functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { CheckAndEnforce } from './scripts/moderation.js';
// Your web app's Firebase configuration
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

// Initialize Firebase and get the authentication service
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Displays an error message using SweetAlert2
 * @param {string} message The error message to display
 */
function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonColor: '#007bff',
    background: '#fff',
    backdrop: `rgba(0,0,0,0.4)`
  });
}

// Utility to disable a button temporarily while showing a "processing" state
function disableButton(button, message, duration = 2000) {
  const originalText = button.innerText;
  button.disabled = true;
  button.innerText = message;
  button.style.backgroundColor = "#ccc";
  setTimeout(() => {
    button.disabled = false;
    button.innerText = originalText;
    button.style.backgroundColor = "#007bff";
  }, duration);
}

// Function to toggle between forms with smooth animation
function toggleForm(showLogin) {
  const loginSection = document.getElementById('login-section');
  const signupSection = document.getElementById('signup-section');
  
  if (showLogin) {
    loginSection.classList.add('active');
    signupSection.classList.remove('active');
  } else {
    signupSection.classList.add('active');
    loginSection.classList.remove('active');
  }
}

// Toggle buttons event listeners - adds active highlighting
document.getElementById('show-login').addEventListener('click', () => {
  document.getElementById('show-login').classList.add('active');
  document.getElementById('show-signup').classList.remove('active');
  toggleForm(true);
});

document.getElementById('show-signup').addEventListener('click', () => {
  document.getElementById('show-signup').classList.add('active');
  document.getElementById('show-login').classList.remove('active');
  toggleForm(false);
});

// Reset password link event listener: prompts for email then triggers password reset
document.getElementById('reset-link').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = prompt("Please enter your email for password reset:");
  if (email) {
    try {
      await sendPasswordResetEmail(auth, email);
      // No success pop-up; UI can be updated as needed.
    } catch (error) {
      console.error("Error sending password reset email:", error);
      showError(error.message);
    }
  }
});

// Sign Up Function: Create a user, update profile with username, and send a verification email
document.getElementById('signup-button').addEventListener('click', async () => {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: username });
    await sendEmailVerification(user);
    // No success pop-up; UI will update on auth state change.
  } catch (error) {
    console.error("Error during sign up:", error);
    showError(error.message);
  }
});

// Login Function: Sign in a user and show error pop-ups if necessary
document.getElementById('login-button').addEventListener('click', async () => {
  const loginButton = document.getElementById('login-button');
  disableButton(loginButton, "Logging in...", 3000);
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      document.getElementById('verification-section').style.display = 'block';
      showError("Email is not verified. Please verify your email address.");
    }
  } catch (error) {
    console.error("Error during login:", error);
    showError(error.message);
  }
});

// Resend Email Verification Function
document.getElementById('send-verification-button').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error("Error sending verification email:", error);
      showError(error.message);
    }
  }
});

// Logout Function: Sign out the user
document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error during logout:", error);
    showError(error.message);
  }
});

// Monitor Auth State: Update the UI based on the user's authentication status
onAuthStateChanged(auth,async user => {
  if (user) {
    const isBanned = await CheckAndEnforce(user.uid);
    if (isBanned) return;

    document.getElementById('user-info').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('user-status').innerText = `Logged in as ${user.displayName || user.email} (${user.emailVerified ? "Verified" : "Not Verified"})`;
    if (!user.emailVerified) {
      document.getElementById('verification-section').style.display = 'block';
    } else {
      document.getElementById('verification-section').style.display = 'none';
      window.location.href = "View.html";
    }
  } else {
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('signup-section').style.display = 'block';
    document.getElementById('verification-section').style.display = 'none';
  }
});
