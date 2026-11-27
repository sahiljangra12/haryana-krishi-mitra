// Settings that are meant to be public.
// ArcGIS Location Platform API key for the sharp photo tiles and place search.
// It is restricted in the ArcGIS portal to https://sahiljangra12.github.io and to basemaps + geocoding only,
// so it is safe in the page. It expires on 19 November 2027: generate a new one in the portal
// (Content > Krishi Mitra Haryana > Generate API key) and paste it here before then.
export const ARCGIS_KEY = "AAPTa1UQNDMFVa920HnKa7Eb1pg..hgUyfBxIsk9WBQqzVcdlXjNJzY0w1b9m8RuggnIjtWT6DuGOnIdVkkRibxfSNFhyT4llStuBk-lIGmnmNQt1rO1EqgXhkNHXx4NNs3UWowCCFHN2j4OF7Ewn8XePUtAwX6KWLqT1bQEqj_YEdXS7stzb-8Wd4HwkD5IZKjElO0ij7V3KbdVezsmoNPGhgZLYsVmmQtfXMnLuCMr_239Fj20PfpLg_-LxkQoyN_RNuTWVuPDgqDjBGmfc-quu5w..AT1_f5V2AT02";
export const ARCGIS_KEY_EXPIRES = "2027-11-19";

// Reading the pages aloud (speaker buttons, the sound switch, the reading bar). Switched off at the owner's request on 27 Nov 2026.
// Set to true to bring it back; nothing else needs to change. The microphone for asking questions is separate and stays on.
export const READ_ALOUD = false;

// Shared forum and marketplace board (Supabase, free tier). Both values are public by design: the database rules in
// supabase/schema.sql decide what this key may do (submit as pending, read approved). The service_role key must NEVER be put here.
// Empty = the forum and the board stay closed and the app says so.
// The key below is the project's "publishable" key (the newer name for the anon public key). Connected on 26 Nov 2026.
export const SUPABASE_URL = "https://uctoozrsjqpxgpiayduz.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_3MXKclf0W2UXDHFBt5F7qA_Io4EG6nI";
