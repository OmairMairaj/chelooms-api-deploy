const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // .env mein ID honi chahiye (Dummy chalegi abhi)

// 1. Google Token Verification
const verifyGoogleToken = async (token) => {

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        return {
            provider: 'Google',
            provider_uid: payload.sub,
            email: payload.email,
            first_name: payload.given_name || "Google", // Fallback agar name na mile
            last_name: payload.family_name || "User",
            picture: payload.picture,
            is_email_verified: payload.email_verified
        };
    } catch (error) {
        throw new Error('Invalid Google Token');
    }
};

// 2. Facebook Token Verification
const verifyFacebookToken = async (token) => {

    try {
        // Facebook Graph API ko call karte hain user data lene ke liye
        const { data } = await axios.get(`https://graph.facebook.com/me`, {
            params: {
                fields: 'id,name,email,first_name,last_name,picture',
                access_token: token
            }
        });

        return {
            provider: 'Facebook', // Note: Apke Enum mein 'Facebook' add karna padega agar nahi hai
            provider_uid: data.id,
            email: data.email,
            first_name: data.first_name || data.name.split(' ')[0],
            last_name: data.last_name || "User",
            picture: data.picture?.data?.url,
            is_email_verified: true // Facebook users trusted maane jate hain
        };
    } catch (error) {
        throw new Error('Invalid Facebook Token');
    }
};

module.exports = { verifyGoogleToken, verifyFacebookToken };