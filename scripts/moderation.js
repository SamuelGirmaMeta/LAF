import { getDatabase, ref as dbRef, get, set, push } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-database.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.esm.min.js';

const GROQ_API_KEY = "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";

/**
 * Bans a user by adding them to the "bannedUsers" list in the database and displays a threatening message.
 *
 * @param {string} uid - The unique identifier of the user to ban.
 * @returns {Promise<void>}
 */
export async function banUser(uid) {
  const db = getDatabase();
  const bannedCountRef = dbRef(db, "bannedCount");

  try {
    const countSnapshot = await get(bannedCountRef);
    let bannedCount = countSnapshot.exists() ? countSnapshot.val() : 0;
    bannedCount += 1;
    await set(bannedCountRef, bannedCount);

    await push(dbRef(db, "bannedUsers"), {
      uid,
      banned: true,
      timestamp: Date.now(),
    });

    // Use the global Swal.fire with "position: 'center'" to center the popup.
    await Swal.default.fire({
      position: 'center',
      icon: "error",
      title: "You Have Been Banned",
      html: `You are the <strong>${bannedCount}th</strong> person to be banned. <br>
             Contact <a href="mailto:Samuelg2027@hmacademy.org">Samuelg2027@hmacademy.org</a> to get unbanned. <br><br>
             <em>Don't even think about trying again...</em>`,
      confirmButtonText: "OK",
    });
  } catch (error) {
    console.error("Error banning user:", error);
  }
}

/**
 * Checks if the current user is banned and enforces the ban by stopping further code execution and showing a message.
 *
 * @param {string} uid - The unique identifier of the user to check.
 * @returns {Promise<boolean>} - Returns true if the user is banned; otherwise, false.
 */
export async function CheckAndEnforce(uid) {
  const db = getDatabase();
  const bannedUsersRef = dbRef(db, "bannedUsers");

  try {
    const snapshot = await get(bannedUsersRef);
    if (snapshot.exists()) {
      const bannedUsers = snapshot.val();
      const isBanned = Object.values(bannedUsers).some((user) => user.uid === uid);
      if (isBanned) {
        await Swal.fire({
          position: 'center',
          icon: "error",
          title: "You Have Been Banned",
          text: "Contact Samuelg2027@hmacademy.org to get unbanned.",
          confirmButtonText: "OK",
        });
        return true;
      } else {
        return false;
      }
    } else {
      // If there are no banned users, simply return false.
      return false;
    }
  } catch (error) {
    console.error("Error checking ban status:", error);
    return false;
  }
}
/**
 * Moderate the content using Groq API.
 *
 * @param {string} title - The title of the post.
 * @param {string} description - The description of the post.
 * @returns {Promise<string>} - Returns "relevant", "unrelated", or "inappropriate".
 */
export async function moderateContent(title, description) {
  const combinedContent = `${title} ${description}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Determine if the following post is "relevant", "unrelated", or "inappropriate" for a community-based lost and found site. Relevant posts are about lost or found items. Unrelated posts might include personal achievements or stories. Inappropriate posts include nudity or offensive content. Respond only with one of these three terms: "relevant", "unrelated", "inappropriate". Post content: "${combinedContent}"`,
          },
        ],
      }),
    });

    const data = await response.json();

    // Extract the AI's response
    const result = data.choices[0].message.content.toLowerCase().trim();
    if (["relevant", "unrelated", "inappropriate"].includes(result)) {
      return result;
    } else {
      console.error("Unexpected moderation result:", result);
      return "unrelated"; // Default to unrelated if unexpected result
    }
  } catch (error) {
    console.error("Error moderating content:", error);
    return "unrelated"; // Default to unrelated on error
  }
}