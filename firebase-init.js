/**
 * firebase-init.js — SFS Connect Mark Entry System
 * Firebase initialization (compat SDK v9)
 * TODO: Replace firebaseConfig values with your actual Firebase project config.
 */

const firebaseConfig = {
  apiKey:            "AIzaSyBXq3fe0uY8UB7-uLGzGIIvZOQf8YjNqaM",
  authDomain:        "st-francis-school-a3e7e.firebaseapp.com",
  projectId:         "st-francis-school-a3e7e",
  storageBucket:     "st-francis-school-a3e7e.firebasestorage.app",
  messagingSenderId: "180123372524",
  appId:             "1:180123372524:web:caed0f2a44d35f19d90ec9",
  measurementId:     "G-TD628HY5XY"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();
