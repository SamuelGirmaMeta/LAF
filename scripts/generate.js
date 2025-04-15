document.getElementById('generate-button').addEventListener('click', async () => {
  const description = document.getElementById('description').value.trim();
  if (!description) {
    alert('Please provide a description of your item.');
    return;
  }
  
  // Show loader (if needed) here
  
  try {
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(description)}?nologo=true&safe=true`);
    
    // Pollination API likely returns an image directly or a URL to the image
    if (response.ok) {
      const imageUrl = response.url; // Use the response URL directly
      document.getElementById('result-image').src = imageUrl;
      openModal();
    } else {
      alert('No image generated. Please try again.');
    }
  } catch (error) {
    console.error('Error generating image:', error);
    alert('There was an error generating the image. Please try again.');
  }
});

// Modal functionality
function openModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'block';
}

document.getElementById('modal-close').addEventListener('click', () => {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});