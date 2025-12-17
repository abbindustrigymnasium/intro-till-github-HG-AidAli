//OLD CODE - Robin har kodat login/signup



/*import PocketBase from '../pocketbase.js'; // adjust path if needed

const pb = new PocketBase('http://pluggo.cloud.mustini.com');

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMsg = document.getElementById("error-msg");

    errorMsg.textContent = "";

    try {
        // Login with PocketBase
        const authData = await pb
            .collection("users")
            .authWithPassword(username, password);

        // Get user's PHI
        const phi = authData.record.phi;

        // Redirect to /PHI/todo
        window.location.href = `../${phi}/todo/index.html`;

    } catch (error) {
        errorMsg.textContent = "Incorrect username or password";
        console.error(error);
    }
});*/