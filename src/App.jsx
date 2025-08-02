import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc,
    Timestamp,
    query,
    deleteDoc
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';

// --- Helper Functions ---
const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-CA'); // YYYY-MM-DD format
};

// --- STYLES OBJECT ---
// All styles are defined here to be self-contained and avoid external CSS issues.
const styles = {
    // Layouts & Containers
    pageContainer: { backgroundColor: '#f7fafc', minHeight: '100vh', fontFamily: 'sans-serif' },
    appContainer: { maxWidth: '896px', margin: '0 auto', padding: '2rem 1rem' },
    authContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7fafc' },
    authBox: { width: '100%', maxWidth: '448px', backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    header: { backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
    modalContent: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '512px', maxHeight: '90vh', overflowY: 'auto' },
    
    // Typography
    authTitle: { fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', color: '#2d3748', marginBottom: '0.5rem' },
    authSubtitle: { textAlign: 'center', color: '#718096', marginBottom: '1.5rem' },
    headerTitle: { fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' },
    headerSubtitle: { fontSize: '0.875rem', color: '#a0aec0' },
    modalTitle: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' },
    label: { display: 'block', color: '#4a5568', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' },
    
    // Form Elements & Buttons
    input: { boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#4a5568', boxSizing: 'border-box' },
    button: { borderRadius: '0.25rem', fontWeight: 'bold', padding: '0.5rem 1rem', transition: 'background-color 0.2s' },
    buttonPrimary: { backgroundColor: '#4299e1', color: 'white' },
    buttonSecondary: { backgroundColor: '#e2e8f0', color: '#2d3748' },
    buttonDanger: { backgroundColor: '#e53e3e', color: 'white' },
    link: { color: '#4299e1', fontWeight: 'bold', textDecoration: 'none' },

    // License List
    licenseListContainer: { backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '0.5rem' },
    licenseItem: { padding: '1rem', borderBottom: '1px solid #edf2f7' },
    licenseItemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    licenseItemTitle: { fontWeight: '600', fontSize: '1.125rem', color: '#2d3748' },
    licenseDetailsGrid: { marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.25rem 1rem', fontSize: '0.875rem', color: '#4a5568' },
    
    // Flash Messages
    flashMessage: { padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid', marginBottom: '1rem' },
    flashError: { backgroundColor: '#fed7d7', borderColor: '#e53e3e', color: '#c53030' },
    flashWarning: { backgroundColor: '#feebc8', borderColor: '#dd6b20', color: '#9c4221' },
};


// --- Authentication Component ---
const AuthPage = ({ onSignIn, onSignUp, onPasswordReset }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setMessage('');
        try {
            if (isSignUp) await onSignUp(email, password);
            else await onSignIn(email, password);
        } catch (err) { setError(err.message); }
    };
    
    const handlePasswordResetClick = async () => {
        if (!email) { setError("Please enter your email address to reset your password."); return; }
        setError(''); setMessage('');
        try {
            await onPasswordReset(email);
            setMessage("Password reset email sent! Please check your inbox.");
        } catch (err) { setError(err.message); }
    };

    return (
        <div style={styles.authContainer}>
            <div style={styles.authBox}>
                <h1 style={styles.authTitle}>SRI GURU RAM DAS PHARMACY</h1>
                <p style={styles.authSubtitle}>{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={styles.label} htmlFor="email">Email</label>
                        <input style={styles.input} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={styles.label} htmlFor="password">Password</label>
                        <input style={styles.input} id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {error && <p style={{ color: '#e53e3e', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
                    {message && <p style={{ color: '#38a169', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem' }}>{message}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button style={{...styles.button, ...styles.buttonPrimary, width: '100%'}} type="submit">{isSignUp ? 'Sign Up' : 'Sign In'}</button>
                        <button style={{...styles.button, ...styles.buttonSecondary, width: '100%'}} type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}>{isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up'}</button>
                        <button style={{...styles.link, background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem'}} type="button" onClick={handlePasswordResetClick}>Forgot Password?</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main App Components ---

const Header = ({ onSignOut }) => (
    <header style={styles.header}>
        <div>
            <h1 style={styles.headerTitle}>SRI GURU RAM DAS PHARMACY</h1>
            <p style={styles.headerSubtitle}>License Expiry Tracker</p>
        </div>
        <button style={{...styles.button, ...styles.buttonDanger}} onClick={onSignOut}>Sign Out</button>
    </header>
);

const FlashMessage = ({ licenses, onRenew }) => {
    const now = new Date();
    const expiringSoon = licenses.filter(l => l.expiryDate && (l.expiryDate.toDate() - now > 0) && (l.expiryDate.toDate() - now <= thirtyDaysInMs));
    const expired = licenses.filter(l => l.expiryDate && l.expiryDate.toDate() < now);

    if (expiringSoon.length === 0 && expired.length === 0) return null;

    return (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {expired.map(license => (
                <div key={license.id} style={{...styles.flashMessage, ...styles.flashError}}>
                    <p style={{ fontWeight: 'bold' }}>License Expired!</p>
                    <p>"{license.name}" expired on {formatDate(license.expiryDate)}. Please renew it immediately.</p>
                </div>
            ))}
            {expiringSoon.map(license => (
                <div key={license.id} style={{...styles.flashMessage, ...styles.flashWarning}}>
                    <p style={{ fontWeight: 'bold' }}>License Expiring Soon!</p>
                    <p>"{license.name}" will expire on {formatDate(license.expiryDate)}. Don't forget to renew.</p>
                </div>
            ))}
        </div>
    );
};

const LicenseFormModal = ({ onSave, onCancel, licenseToEdit, storage, userId }) => {
    const [name, setName] = useState(licenseToEdit ? licenseToEdit.name : '');
    const [expiryDate, setExpiryDate] = useState(licenseToEdit ? formatDate(licenseToEdit.expiryDate) : '');
    const [licenseNumber, setLicenseNumber] = useState(licenseToEdit ? licenseToEdit.licenseNumber : '');
    const [issuingAuthority, setIssuingAuthority] = useState(licenseToEdit ? licenseToEdit.issuingAuthority : '');
    const [notes, setNotes] = useState(licenseToEdit ? licenseToEdit.notes : '');
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !expiryDate) { setError('License Name and Expiry Date are required.'); return; }
        const newExpiryDate = new Date(expiryDate);
        if (isNaN(newExpiryDate.getTime())) { setError('Invalid date format.'); return; }
        
        setIsUploading(true);
        setError('');

        let fileURL = licenseToEdit?.fileURL || '';
        let fileName = licenseToEdit?.fileName || '';

        if (file) {
            const storageRef = ref(storage, `licenses/${userId}/${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                fileURL = await getDownloadURL(snapshot.ref);
                fileName = file.name;
            } catch (uploadError) {
                setError("Failed to upload file. Please try again.");
                setIsUploading(false);
                return;
            }
        }
        
        const licenseData = { name, expiryDate: Timestamp.fromDate(newExpiryDate), licenseNumber: licenseNumber || '', issuingAuthority: issuingAuthority || '', notes: notes || '', fileURL, fileName };
        onSave(licenseData);
        setIsUploading(false);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>{licenseToEdit ? 'Renew License' : 'Add New License'}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                        <div>
                            <label style={styles.label}>License Name*</label>
                            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} readOnly={!!licenseToEdit} />
                        </div>
                        <div>
                            <label style={styles.label}>New Expiry Date*</label>
                            <input style={styles.input} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                        </div>
                         <div>
                            <label style={styles.label}>License Number</label>
                            <input style={styles.input} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} readOnly={!!licenseToEdit}/>
                        </div>
                        <div>
                            <label style={styles.label}>Issuing Authority</label>
                            <input style={styles.input} value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} readOnly={!!licenseToEdit}/>
                        </div>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Notes</label>
                        <textarea style={{...styles.input, height: '80px'}} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                    </div>
                    <div style={{marginBottom: '1rem'}}>
                        <label style={styles.label}>Attach Document</label>
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                        {licenseToEdit?.fileName && !file && <p style={{fontSize: '0.875rem', color: '#718096', marginTop: '0.25rem'}}>Current file: {licenseToEdit.fileName}</p>}
                    </div>
                    {error && <p style={{color: '#e53e3e', fontSize: '0.875rem', marginBottom: '1rem'}}>{error}</p>}
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                        <button style={{...styles.button, ...styles.buttonSecondary}} type="button" onClick={onCancel}>Cancel</button>
                        <button style={{...styles.button, ...styles.buttonPrimary}} type="submit" disabled={isUploading}>{isUploading ? 'Saving...' : 'Save'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LicenseList = ({ licenses, onRenew, onDelete, onAddLicenseClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredLicenses = licenses.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const sortedLicenses = [...filteredLicenses].sort((a,b) => a.expiryDate.toDate() - b.expiryDate.toDate());

    return (
        <div style={styles.licenseListContainer}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <input style={{...styles.input, flexGrow: 1}} placeholder="Search by license name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <button style={{...styles.button, ...styles.buttonPrimary}} onClick={onAddLicenseClick}>+ Add License</button>
            </div>
            {sortedLicenses.length === 0 ? (
                 <div style={{textAlign: 'center', color: '#718096', padding: '2.5rem 0'}}><p>{licenses.length > 0 ? "No licenses match your search." : "No licenses added yet."}</p></div>
            ) : (
                <ul>{sortedLicenses.map(license => (
                    <li key={license.id} style={styles.licenseItem}>
                        <div style={styles.licenseItemHeader}>
                            <h3 style={styles.licenseItemTitle}>{license.name}</h3>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button style={{...styles.button, backgroundColor: '#38a169', color: 'white', fontSize: '0.8rem', padding: '0.4rem 0.8rem'}} onClick={() => onRenew(license.id)}>Renew</button>
                                <button style={{...styles.button, ...styles.buttonDanger, fontSize: '0.8rem', padding: '0.4rem 0.8rem'}} onClick={() => onDelete(license.id)}>Delete</button>
                            </div>
                        </div>
                        <div style={styles.licenseDetailsGrid}>
                            <p><strong>Expires on:</strong> {formatDate(license.expiryDate)}</p>
                            {license.licenseNumber && <p><strong>License No:</strong> {license.licenseNumber}</p>}
                            {license.issuingAuthority && <p><strong>Authority:</strong> {license.issuingAuthority}</p>}
                            {license.fileURL && <a href={license.fileURL} target="_blank" rel="noopener noreferrer" style={styles.link}>View Document</a>}
                        </div>
                        {license.notes && <p style={{marginTop: '0.5rem', fontSize: '0.875rem', color: '#4a5568', backgroundColor: '#f7fafc', padding: '0.5rem', borderRadius: '0.25rem'}}><strong>Notes:</strong> {license.notes}</p>}
                    </li>
                ))}</ul>
            )}
        </div>
    );
};

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div style={styles.modalOverlay}>
        <div style={{...styles.modalContent, maxWidth: '448px'}}>
            <h3 style={styles.modalTitle}>Confirm Action</h3>
            <p style={{color: '#4a5568', marginBottom: '1.5rem'}}>{message}</p>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button style={{...styles.button, ...styles.buttonSecondary}} onClick={onCancel}>Cancel</button>
                <button style={{...styles.button, ...styles.buttonDanger}} onClick={onConfirm}>Delete</button>
            </div>
        </div>
    </div>
);


export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [storage, setStorage] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [licenses, setLicenses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [licenseToEdit, setLicenseToEdit] = useState(null);
    const [licenseToDelete, setLicenseToDelete] = useState(null);

    useEffect(() => {
        try {
            const firebaseConfig = {
              apiKey: "AIzaSyDpnXYEonbPC_Gx2yEm_g97ZygXp9KUxjU",
              authDomain: "sri-guru-ram-daspharmacy-dl.firebaseapp.com",
              projectId: "sri-guru-ram-daspharmacy-dl",
              storageBucket: "sri-guru-ram-daspharmacy-dl.appspot.com",
              messagingSenderId: "292336822543",
              appId: "1:292336822543:web:521afde212cd3b77a3b67a",
              measurementId: "G-665M4J6WE9"
            };
            const app = initializeApp(firebaseConfig);
            setAuth(getAuth(app));
            setDb(getFirestore(app));
            setStorage(getStorage(app));
        } catch (e) { console.error("CRITICAL FIREBASE ERROR:", e); setIsLoading(false); }
    }, []);
    
    useEffect(() => {
        if(auth) {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                setUserId(user ? user.uid : null);
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [auth]);

    useEffect(() => {
        if (db && userId) {
            const licensesCollectionPath = `users/${userId}/licenses`;
            const q = query(collection(db, licensesCollectionPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const licensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLicenses(licensesData);
            }, (error) => { console.error("Error fetching licenses:", error); });
            return () => unsubscribe();
        } else {
            setLicenses([]);
        }
    }, [db, userId]);

    const handleSignUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const handleSignIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const handlePasswordReset = (email) => sendPasswordResetEmail(auth, email);
    const handleSignOut = () => signOut(auth);

    const handleSave = (licenseData) => {
        const collectionPath = `users/${userId}/licenses`;
        if (licenseToEdit) {
            const licenseRef = doc(db, collectionPath, licenseToEdit.id);
            updateDoc(licenseRef, licenseData).then(() => {
                setShowModal(false);
                setLicenseToEdit(null);
            });
        } else {
            addDoc(collection(db, collectionPath), licenseData).then(() => {
                setShowModal(false);
            });
        }
    };
    
    const handleDeleteRequest = (id) => setLicenseToDelete(id);

    const handleConfirmDelete = async () => {
        if (db && userId && licenseToDelete) {
            await deleteDoc(doc(db, `users/${userId}/licenses`, licenseToDelete));
        }
        setLicenseToDelete(null);
    };

    const handleRenewClick = (id) => {
        const license = licenses.find(l => l.id === id);
        setLicenseToEdit(license);
        setShowModal(true);
    };

    if (isLoading) {
        return <div style={{...styles.pageContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
    }

    if (!userId) {
        return <AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} onPasswordReset={handlePasswordReset} />;
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.appContainer}>
                <Header onSignOut={handleSignOut} />
                <main>
                    <FlashMessage licenses={licenses} onRenew={handleRenewClick} />
                    <LicenseList 
                        licenses={licenses} 
                        onRenew={handleRenewClick} 
                        onDelete={handleDeleteRequest}
                        onAddLicenseClick={() => { setLicenseToEdit(null); setShowModal(true); }}
                    />
                </main>
                {showModal && (
                    <LicenseFormModal
                        onSave={handleSave}
                        onCancel={() => { setShowModal(false); setLicenseToEdit(null); }}
                        licenseToEdit={licenseToEdit}
                        storage={storage}
                        userId={userId}
                    />
                )}
                {licenseToDelete && (
                    <ConfirmationModal
                        message="Are you sure you want to delete this license? This action cannot be undone."
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setLicenseToDelete(null)}
                    />
                )}
            </div>
        </div>
    );
}
