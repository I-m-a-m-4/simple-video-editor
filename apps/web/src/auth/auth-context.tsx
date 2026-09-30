"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signInWithPopup,
	signOut as firebaseSignOut,
	updateProfile,
	GoogleAuthProvider,
	type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/services/firebase";

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	image?: string;
	createdAt?: string;
}

export interface AuthContextType {
	user: UserProfile | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
	signUpWithEmail: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
	signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
	signOut: () => Promise<void>;
}

const STORAGE_KEY = "opencut_auth_user";

function getFirebaseErrorMessage(err: any): string {
	if (!err) return "Authentication failed.";
	const code = err.code || "";
	switch (code) {
		case "auth/email-already-in-use":
			return "An account with this email already exists. Please sign in.";
		case "auth/invalid-email":
			return "Please enter a valid email address.";
		case "auth/wrong-password":
		case "auth/invalid-credential":
			return "Invalid email or password. Please check your credentials.";
		case "auth/user-not-found":
			return "No account found with this email. Please create an account.";
		case "auth/weak-password":
			return "Password is too weak. Please use at least 6 characters.";
		case "auth/popup-closed-by-user":
			return "Google sign-in was cancelled.";
		case "auth/popup-blocked":
			return "Popup was blocked by your browser. Please allow popups for Google sign-in.";
		case "auth/network-request-failed":
			return "Network connection issue. Please check your internet.";
		case "auth/too-many-requests":
			return "Too many failed attempts. Please try again in a few minutes.";
		default:
			return err.message?.replace("Firebase: ", "") || "Authentication failed. Please try again.";
	}
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isAuthenticated: false,
	isLoading: true,
	signInWithEmail: async () => ({ success: false }),
	signUpWithEmail: async () => ({ success: false }),
	signInWithGoogle: async () => ({ success: false }),
	signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const saveUserSession = (newUser: UserProfile) => {
		setUser(newUser);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
			localStorage.setItem(
				"opencut_admin_session",
				JSON.stringify({
					name: newUser.name,
					email: newUser.email,
					role: "Super Admin",
					loggedInAt: new Date().toISOString(),
				}),
			);
		} catch (err) {
			console.error("Failed to persist user session:", err);
		}
	};

	// Listen to live Firebase Auth state changes
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
			if (firebaseUser) {
				const profile: UserProfile = {
					id: firebaseUser.uid,
					name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Video Creator",
					email: firebaseUser.email || "",
					image: firebaseUser.photoURL || undefined,
				};
				setUser(profile);
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
				} catch {}
			} else {
				// User is signed out from Firebase
				setUser(null);
				try {
					localStorage.removeItem(STORAGE_KEY);
					localStorage.removeItem("opencut_admin_session");
				} catch {}
			}
			setIsLoading(false);
		});

		return () => unsubscribe();
	}, []);

	// Sync auth across tabs
	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) {
				if (e.newValue) {
					try {
						const parsed = JSON.parse(e.newValue) as UserProfile;
						setUser(parsed);
					} catch {
						setUser(null);
					}
				} else {
					setUser(null);
				}
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	const signUpWithEmail = async (name: string, email: string, password: string) => {
		const trimmedName = name.trim() || email.split("@")[0];
		const trimmedEmail = email.trim().toLowerCase();

		try {
			const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
			if (trimmedName && cred.user) {
				await updateProfile(cred.user, { displayName: trimmedName });
			}
			const profile: UserProfile = {
				id: cred.user.uid,
				name: trimmedName,
				email: cred.user.email || trimmedEmail,
				createdAt: new Date().toISOString(),
			};
			saveUserSession(profile);
			return { success: true };
		} catch (err: any) {
			console.error("Firebase signup error:", err);
			const message = getFirebaseErrorMessage(err);
			return { success: false, error: message };
		}
	};

	const signInWithEmail = async (email: string, password: string) => {
		const trimmedEmail = email.trim().toLowerCase();

		try {
			const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
			const profile: UserProfile = {
				id: cred.user.uid,
				name: cred.user.displayName || trimmedEmail.split("@")[0],
				email: cred.user.email || trimmedEmail,
				image: cred.user.photoURL || undefined,
			};
			saveUserSession(profile);
			return { success: true };
		} catch (err: any) {
			console.error("Firebase signin error:", err);
			const message = getFirebaseErrorMessage(err);
			return { success: false, error: message };
		}
	};

	const signInWithGoogle = async () => {
		try {
			const provider = new GoogleAuthProvider();
			provider.addScope("profile");
			provider.addScope("email");
			provider.setCustomParameters({ prompt: "select_account" });

			const result = await signInWithPopup(auth, provider);
			const profile: UserProfile = {
				id: result.user.uid,
				name: result.user.displayName || result.user.email?.split("@")[0] || "Google Creator",
				email: result.user.email || "",
				image: result.user.photoURL || undefined,
				createdAt: new Date().toISOString(),
			};
			saveUserSession(profile);
			return { success: true };
		} catch (err: any) {
			console.error("Firebase Google signin error:", err);
			if (err?.code === "auth/popup-closed-by-user") {
				return { success: false, error: "Google sign-in popup was closed." };
			}
			if (err?.code === "auth/popup-blocked") {
				return { success: false, error: "Google popup was blocked by browser. Please allow popups." };
			}
			if (err?.code === "auth/cancelled-popup-request") {
				return { success: false, error: "A sign-in request is already in progress." };
			}
			const message = getFirebaseErrorMessage(err);
			return { success: false, error: message };
		}
	};

	const signOut = async () => {
		try {
			await firebaseSignOut(auth);
		} catch (err) {
			console.error("Firebase signout error:", err);
		} finally {
			setUser(null);
			try {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem("opencut_admin_session");
			} catch {}
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated: !!user,
				isLoading,
				signInWithEmail,
				signUpWithEmail,
				signInWithGoogle,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
