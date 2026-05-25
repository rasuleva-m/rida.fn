import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Clock, LogOut, Loader2, ShieldCheck } from "lucide-react";

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)
    ?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean) ?? [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => auth.signOut();

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { status });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Check if user is the allowed admin email(s)
  const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());

  if (authChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-secondary">
        <Loader2 className="animate-spin text-brand-accent" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-brand-secondary px-6">
        <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md w-full text-center space-y-8">
          <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto text-brand-accent">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-serif italic mb-2">Admin Access</h1>
            <p className="text-xs text-brand-muted uppercase tracking-widest">Please sign in to proceed</p>
          </div>
          <button 
            onClick={login}
            className="w-full bg-brand-ink text-brand-paper py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-brand-accent transition-all duration-300"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-brand-secondary px-6 text-center">
        <XCircle className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-serif italic mb-2">Access Denied</h1>
        <p className="text-xs text-brand-muted uppercase tracking-widest mb-8">You are not authorized to view this page</p>
        {adminEmails.length === 0 && (
          <p className="text-[10px] text-brand-muted uppercase tracking-widest mb-6">
            Missing VITE_ADMIN_EMAILS configuration
          </p>
        )}
        <button onClick={logout} className="text-[10px] uppercase tracking-widest font-bold underline">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-serif italic tracking-tighter lowercase leading-none mb-2">RIDA.FN</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent">Booking Management Panel</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink/60 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {bookings.map((booking) => (
                <motion.div 
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className={`w-2 h-2 rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-500' :
                        booking.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <h3 className="text-lg font-medium">{booking.clientName}</h3>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-brand-muted font-bold flex flex-wrap gap-x-4 gap-y-2">
                      <span className="text-brand-ink">{booking.service}</span>
                      <span>{booking.clientPhone}</span>
                      <span>{new Date(booking.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-serif italic">
                      <span className="flex items-center space-x-1">
                        <Clock size={12} className="text-brand-accent" />
                        <span>{booking.date} at {booking.time}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    {booking.status === 'pending' ? (
                      <>
                        <button 
                          onClick={() => updateStatus(booking.id, 'confirmed')}
                          className="flex-grow md:flex-none flex items-center justify-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle2 size={16} />
                          <span>Confirm</span>
                        </button>
                        <button 
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="flex-grow md:flex-none flex items-center justify-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-red-600 transition-colors"
                        >
                          <XCircle size={16} />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <div className={`px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold border ${
                        booking.status === 'confirmed' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'
                      }`}>
                        {booking.status}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {bookings.length === 0 && (
              <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-brand-border">
                <p className="text-xs text-brand-muted uppercase tracking-[0.2em]">No bookings found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
