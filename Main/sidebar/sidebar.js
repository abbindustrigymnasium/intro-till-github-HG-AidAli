// Fetch the sidebar HTML and insert it into the placeholder
fetch('../sidebar/sidebar.html')  //Fix this 
    .then(response => response.text())
    .then(data => {
        document.getElementById('sidebar-placeholder').innerHTML = data;
    })
    .catch(err => console.error('Error loading sidebar:', err));