// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // <-- New import

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // <-- Initialize navigation

    const api = axios.create({
        baseURL: 'http://127.0.0.1:8000',
    });

    api.interceptors.request.use((config) => {
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser({ email: decoded.sub, role: decoded.role });
                localStorage.setItem('token', token);
            } catch (error) {
                console.error("Invalid token", error);
                logout();
            }
        } else {
            setUser(null);
            localStorage.removeItem('token');
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/login', formData);
        setToken(response.data.access_token);
        return jwtDecode(response.data.access_token).role; 
    };

    // --- UPDATED LOGOUT FUNCTION ---
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        navigate('/login'); // Instantly redirect to login page
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, api, loading }}>
            {children}
        </AuthContext.Provider>
    );
};