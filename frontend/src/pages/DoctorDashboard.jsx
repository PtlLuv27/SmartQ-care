import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Stethoscope, Users, PlayCircle, PauseCircle, StopCircle, RefreshCw, Activity, User, CalendarClock, AlertTriangle, CheckCircle, Save, X, Edit } from 'lucide-react';

export default function DoctorDashboard() {
    const { user, api, logout } = useContext(AuthContext);
    
    // Tab States
    const [activeTab, setActiveTab] = useState('queue'); // 'profile', 'queue', 'future'
    
    // Data States
    const [queue, setQueue] = useState([]);
    const [futureAppointments, setFutureAppointments] = useState([]);
    const [profile, setProfile] = useState(null);
    
    // UI & Action States
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [emergencyPrompt, setEmergencyPrompt] = useState(null);

    // Initial Data Fetch & Auto-Polling
    useEffect(() => {
        fetchQueue();
        fetchProfile();
        fetchFutureAppointments();
        
        // Auto-polling for the live queue and emergency detection
        const intervalId = setInterval(() => {
            fetchQueue();
            fetchFutureAppointments();
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await api.get('/doctor/my-queue');
            const newQueue = res.data;
            
            // EMERGENCY DETECTION LOGIC
            // If the first waiting patient is an emergency, trigger the prompt
            const firstWaiting = newQueue.find(q => q.status === 'waiting');
            if (firstWaiting && firstWaiting.is_emergency) { // Assuming your backend passes is_emergency in LiveQueue or Appointment join
                setEmergencyPrompt(`EMERGENCY: Patient for Appt #${firstWaiting.appointment_id} requires immediate attention!`);
            } else {
                setEmergencyPrompt(null);
            }
            
            setQueue(newQueue);
        } catch (err) {
            console.error("Failed to fetch queue", err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get('/doctor/profile'); // Expecting a dedicated profile route
            setProfile(res.data);
        } catch (err) {
            // Fallback mock if route doesn't exist yet
            setProfile({ 
                name: user?.name || 'Doctor', 
                email: user?.email, 
                phone: '+1 234 567 8900', 
                specialization: 'General Practice', 
                room_number: '101' 
            });
        }
    };

    const fetchFutureAppointments = async () => {
        try {
            const res = await api.get('/doctor/future-appointments'); // Expecting route for scheduled apps
            setFutureAppointments(res.data);
        } catch (err) {
            console.error("Failed to fetch future appointments");
        }
    };

    // --- Actions ---

    const handleCallNext = async () => {
        setIsLoading(true);
        setMessage('');
        setEmergencyPrompt(null); // Clear prompt if we are addressing it
        try {
            const res = await api.post('/doctor/call-next');
            setMessage(res.data.message);
            fetchQueue(); 
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage('Error calling next patient.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveSession = async () => {
        try {
            await api.post('/doctor/leave-session');
            setMessage('Session paused. Patients have been notified of your urgent departure.');
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            setMessage('Error pausing session.');
        }
    };

    const handleEndSession = async () => {
        if (!window.confirm("Are you sure you want to end your session for the day? This clears your active patient.")) return;
        try {
            await api.post('/doctor/end-session');
            setMessage('Session ended successfully.');
            fetchQueue();
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setMessage('Error ending session.');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put('/doctor/profile', profile);
            setMessage('Profile updated successfully!');
            setIsEditingProfile(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to update profile.');
        }
    };

    // Filter queue states
    const activePatient = queue.find(q => q.status === 'active');
    const waitingPatients = queue.filter(q => q.status === 'waiting');

    return (
        <div className="min-h-screen bg-slate-50 relative">
            
            {/* EMERGENCY PROMPT OVERLAY */}
            {emergencyPrompt && (
                <div className="fixed inset-0 bg-red-900/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center animate-bounce">
                        <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-3xl font-black text-slate-800 mb-4">Emergency Alert</h2>
                        <p className="text-xl text-slate-600 mb-8 font-medium">{emergencyPrompt}</p>
                        <button 
                            onClick={handleCallNext} 
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <PlayCircle className="w-6 h-6" /> Bypass Queue & Call Emergency Now
                        </button>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <header className="bg-blue-900 shadow-md border-b border-blue-800 px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Stethoscope className="text-blue-300 w-6 h-6" />
                    <h1 className="text-xl font-bold">SmartQ Doctor Portal</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-blue-200 font-medium">{user?.email}</span>
                    <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 font-bold transition-colors">Log out</button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto mt-8 px-4 flex gap-8">
                
                {/* Sidebar Navigation */}
                <aside className="w-64 shrink-0 space-y-2">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <User className="w-5 h-5" /> Homepage / Profile
                    </button>
                    <button onClick={() => setActiveTab('queue')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'queue' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <Users className="w-5 h-5" /> Live Queue
                    </button>
                    <button onClick={() => setActiveTab('future')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'future' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <CalendarClock className="w-5 h-5" /> Future Appointments
                    </button>
                </aside>

                <section className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
                    
                    {message && (
                        <div className="mb-6 p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium flex items-center gap-2 animate-pulse">
                            <Activity className="w-5 h-5" /> {message}
                        </div>
                    )}

                    {/* 1. HOMEPAGE / PROFILE TAB */}
                    {activeTab === 'profile' && profile && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Doctor Profile</h2>
                                {!isEditingProfile && (
                                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
                                        <Edit className="w-4 h-4" /> Edit Details
                                    </button>
                                )}
                            </div>

                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium mb-1 block">Full Name</label><input required type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="text-sm font-medium mb-1 block">Email</label><input required type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="text-sm font-medium mb-1 block">Phone</label><input required type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="text-sm font-medium mb-1 block">Specialization</label><input required type="text" value={profile.specialization} onChange={(e) => setProfile({...profile, specialization: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="text-sm font-medium mb-1 block">Room Number</label><input required type="text" value={profile.room_number} onChange={(e) => setProfile({...profile, room_number: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    
                                    <div className="col-span-2 flex gap-3 mt-4">
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><Save className="w-4 h-4"/> Save Changes</button>
                                        <button type="button" onClick={() => setIsEditingProfile(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-6 rounded-lg flex items-center gap-2"><X className="w-4 h-4"/> Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                                    <div><p className="text-sm text-slate-500">Full Name</p><p className="font-bold text-lg text-slate-800">Dr. {profile.name}</p></div>
                                    <div><p className="text-sm text-slate-500">Email</p><p className="font-medium text-slate-800">{profile.email}</p></div>
                                    <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium text-slate-800">{profile.phone}</p></div>
                                    <div><p className="text-sm text-slate-500">Specialization</p><p className="font-medium text-slate-800">{profile.specialization}</p></div>
                                    <div><p className="text-sm text-slate-500">Room Number</p><p className="font-black text-blue-600 text-xl">{profile.room_number}</p></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. LIVE QUEUE TAB */}
                    {activeTab === 'queue' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Live Session Queue</h2>
                            <div className="grid grid-cols-2 gap-8">
                                {/* Session Controls & Active Patient */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-900/10 p-8 text-center">
                                        <h2 className="text-slate-500 font-bold tracking-wider uppercase text-sm mb-4">Currently Serving</h2>
                                        
                                        {activePatient ? (
                                            <div>
                                                <div className="text-5xl font-black text-slate-800 mb-2">
                                                    Appt #{activePatient.appointment_id}
                                                </div>
                                                <p className="text-blue-600 font-medium mb-8">Consultation in progress.</p>
                                            </div>
                                        ) : (
                                            <div className="py-8">
                                                <div className="text-2xl font-bold text-slate-300 mb-2">No Active Patient</div>
                                                <p className="text-slate-500">Ready to begin your session?</p>
                                            </div>
                                        )}

                                        <button 
                                            onClick={handleCallNext}
                                            disabled={isLoading || (waitingPatients.length === 0 && !activePatient)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
                                        >
                                            <PlayCircle className="w-6 h-6" /> 
                                            {activePatient ? 'Finish & Call Next' : 'Start Session (Call First)'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={handleLeaveSession} className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                            <PauseCircle className="w-5 h-5" /> Leave (Urgent)
                                        </button>
                                        <button onClick={handleEndSession} className="bg-red-100 hover:bg-red-200 text-red-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                            <StopCircle className="w-5 h-5" /> End Session
                                        </button>
                                    </div>
                                </div>

                                {/* Waiting List */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-blue-600" /> Waiting Room
                                        </h3>
                                        <button onClick={fetchQueue} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {waitingPatients.length === 0 ? (
                                            <p className="text-center text-slate-400 py-8 font-medium">No patients waiting.</p>
                                        ) : (
                                            waitingPatients.map((patient, index) => (
                                                <div key={patient.id} className={`p-4 border rounded-lg flex justify-between items-center ${patient.is_emergency ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 text-white font-bold rounded-full flex items-center justify-center ${patient.is_emergency ? 'bg-red-600' : 'bg-blue-600'}`}>
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                                Appt #{patient.appointment_id} 
                                                                {patient.is_emergency && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase">Emergency</span>}
                                                            </p>
                                                            <p className="text-xs text-slate-500">Est. Wait: ~{patient.estimated_wait_time_mins} mins</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. FUTURE APPOINTMENTS TAB */}
                    {activeTab === 'future' && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <CalendarClock className="w-6 h-6 text-blue-600" /> Scheduled Appointments
                            </h2>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                {futureAppointments.length === 0 ? (
                                    <div className="text-center py-10">
                                        <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">No future appointments scheduled at this time.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {futureAppointments.map(app => (
                                            <div key={app.id} className="p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-sm">
                                                <div>
                                                    <p className="font-bold text-slate-800">Appointment #{app.id}</p>
                                                    <p className="text-sm text-slate-600">Patient Issue: {app.disease}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-blue-600">{new Date(app.scheduled_time).toLocaleDateString()}</p>
                                                    <p className="text-xs text-slate-500">{new Date(app.scheduled_time).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                </section>
            </main>
        </div>
    );
}