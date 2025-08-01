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

// --- Authentication Component ---
const AuthPage = ({ onSignIn, onSignUp, onPasswordReset }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            if (isSignUp) {
                await onSignUp(email, password);
            } else {
                await onSignIn(email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };
    
    const handlePasswordResetClick = async () => {
        if (!email) {
            setError("Please enter your email address to reset your password.");
            return;
        }
        setError('');
        setMessage('');
        try {
            await onPasswordReset(email);
            setMessage("Password reset email sent! Please check your inbox.");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">SRI GURU RAM DAS PHARMACY</h1>
                <p className="text-center text-gray-500 mb-6">{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            id="password"
                            type="password"
                            placeholder="******************"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
                    {message && <p className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{message}</p>}
                    <div className="flex flex-col items-center justify-between space-y-4">
                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            {isSignUp ? 'Have an account? Sign In' : 'Need an account? Sign Up'}
                        </button>
                        <button
                            type="button"
                            onClick={handlePasswordResetClick}
                            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                        >
                            Forgot Password?
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- React Components ---

const Header = ({ onSignOut }) => (
    <header className="bg-white shadow-md rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">SRI GURU RAM DAS PHARMACY</h1>
            <p className="text-sm text-gray-500">License Expiry Tracker</p>
        </div>
        <button
            onClick={onSignOut}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105"
        >
            Sign Out
        </button>
    </header>
);

const FlashMessage = ({ licenses, onRenew }) => {
    const now = new Date();
    const expiringSoon = licenses.filter(license => {
        if (!license.expiryDate) return false;
        const expiry = license.expiryDate.toDate();
        const diff = expiry.getTime() - now.getTime();
        return diff > 0 && diff <= thirtyDaysInMs;
    });

    const expired = licenses.filter(license => {
         if (!license.expiryDate) return false;
         return license.expiryDate.toDate().getTime() < now.getTime();
    });

    if (expiringSoon.length === 0 && expired.length === 0) {
        return null;
    }

    return (
        <div className="mb-6 space-y-4">
            {expired.map(license => (
                <div key={license.id} className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
                    <p className="font-bold">License Expired!</p>
                    <p>"{license.name}" expired on {formatDate(license.expiryDate)}. Please renew it immediately.</p>
                     <button onClick={() => onRenew(license.id)} className="mt-2 bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 text-sm">Renew Now</button>
                </div>
            ))}
            {expiringSoon.map(license => (
                <div key={license.id} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow-md" role="alert">
                    <p className="font-bold">License Expiring Soon!</p>
                    <p>"{license.name}" will expire on {formatDate(license.expiryDate)}. Don't forget to renew.</p>
                    <button onClick={() => onRenew(license.id)} className="mt-2 bg-yellow-500 text-white py-1 px-3 rounded hover:bg-yellow-600 text-sm">Renew Now</button>
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

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !expiryDate) {
            setError('License Name and Expiry Date are required.');
            return;
        }
        const newExpiryDate = new Date(expiryDate);
        if (isNaN(newExpiryDate.getTime())) {
            setError('Invalid date format.');
            return;
        }
        
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
                console.error("File upload error:", uploadError);
                setError("Failed to upload file. Please try again.");
                setIsUploading(false);
                return;
            }
        }
        
        const licenseData = { 
            name, 
            expiryDate: Timestamp.fromDate(newExpiryDate),
            licenseNumber: licenseNumber || '',
            issuingAuthority: issuingAuthority || '',
            notes: notes || '',
            fileURL,
            fileName
        };
        
        onSave(licenseData);
        setIsUploading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{licenseToEdit ? 'Renew License' : 'Add New License'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="mb-4">
                            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">License Name*</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="input-style" placeholder="e.g., Drug License 20A" readOnly={!!licenseToEdit} />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="expiryDate" className="block text-gray-700 text-sm font-bold mb-2">New Expiry Date*</label>
                            <input type="date" id="expiryDate" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input-style" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="licenseNumber" className="block text-gray-700 text-sm font-bold mb-2">License Number</label>
                            <input type="text" id="licenseNumber" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="input-style" placeholder="e.g., 12345/ABC" readOnly={!!licenseToEdit}/>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="issuingAuthority" className="block text-gray-700 text-sm font-bold mb-2">Issuing Authority</label>
                            <input type="text" id="issuingAuthority" value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} className="input-style" placeholder="e.g., State Drug Control" readOnly={!!licenseToEdit}/>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Notes</label>
                        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-style" rows="3" placeholder="Add any relevant notes here..."></textarea>
                    </div>
                     <div className="mb-4">
                        <label htmlFor="file" className="block text-gray-700 text-sm font-bold mb-2">Attach Document</label>
                        <input type="file" id="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {licenseToEdit?.fileName && !file && <p className="text-sm text-gray-500 mt-1">Current file: {licenseToEdit.fileName}. Upload a new file to replace it.</p>}
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-end space-x-4">
                        <button type="button" onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Cancel
                        </button>
                        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={isUploading}>
                            {isUploading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const LicenseList = ({ licenses, onRenew, onDelete, onAddLicenseClick }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLicenses = licenses.filter(license => 
        license.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedLicenses = [...filteredLicenses].sort((a,b) => a.expiryDate.toDate() - b.expiryDate.toDate());

    return (
        <div className="bg-white shadow-md rounded-lg">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b">
                <div className="relative w-full md:w-1/2">
                     <input 
                        type="text"
                        placeholder="Search by license name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-style w-full pl-10"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button
                    onClick={onAddLicenseClick}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-transform transform hover:scale-105 w-full md:w-auto"
                >
                    + Add License
                </button>
            </div>
            {sortedLicenses.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                    <p>{licenses.length > 0 ? "No licenses match your search." : "No licenses added yet."}</p>
                 </div>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {sortedLicenses.map(license => (
                        <li key={license.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-gray-800">{license.name}</h3>
                                <div className="flex items-center space-x-2 flex-wrap gap-2">
                                    <button onClick={() => onRenew(license.id)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-full text-sm">Renew</button>
                                    <button onClick={() => onDelete(license.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm">Delete</button>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                                <p><strong className="font-medium text-gray-700">Expires on:</strong> {formatDate(license.expiryDate)}</p>
                                {license.licenseNumber && <p><strong className="font-medium text-gray-700">License No:</strong> {license.licenseNumber}</p>}
                                {license.issuingAuthority && <p><strong className="font-medium text-gray-700">Authority:</strong> {license.issuingAuthority}</p>}
                                {license.fileURL && <a href={license.fileURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"><strong className="font-medium text-gray-700">Document:</strong> View File</a>}
                            </div>
                            {license.notes && <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded"><strong className="font-medium text-gray-700">Notes:</strong> {license.notes}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [storage, setStorage] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [licenses, setLicenses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [licenseToEdit, setLicenseToEdit] = useState(null);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    useEffect(() => {
        try {
            // Your web app's Firebase configuration
            const firebaseConfig = {
              apiKey: "AIzaSyDpnXYEonbPC_Gx2yEm_g97ZygXp9KUxjU",
              authDomain: "sri-guru-ram-daspharmacy-dl.firebaseapp.com",
              projectId: "sri-guru-ram-daspharmacy-dl",
              storageBucket: "sri-guru-ram-daspharmacy-dl.appspot.com",
              messagingSenderId: "292336822543",
              appId: "1:292336822543:web:521afde212cd3b77a3b67a",
              measurementId: "G-665M4J6WE9"
            };

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            const storageInstance = getStorage(app);
            setAuth(authInstance);
            setDb(dbInstance);
            setStorage(storageInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                setUserId(user ? user.uid : null);
                setIsLoading(false);
            });
            
            return () => unsubscribe();

        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setIsLoading(false);
        }
    }, []);

    const licensesCollectionPath = useMemo(() => {
        if (!userId) return null;
        return `artifacts/${appId}/users/${userId}/licenses`;
    }, [appId, userId]);

    useEffect(() => {
        if (db && userId && licensesCollectionPath) {
            const q = query(collection(db, licensesCollectionPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const licensesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setLicenses(licensesData);
            }, (error) => {
                console.error("Error fetching licenses:", error);
            });

            return () => unsubscribe();
        } else {
            setLicenses([]); // Clear licenses on sign out
        }
    }, [db, userId, licensesCollectionPath]);

    const handleSignUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
    const handleSignIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const handlePasswordReset = (email) => sendPasswordResetEmail(auth, email);
    const handleSignOut = () => signOut(auth);

    const handleAddLicense = async (licenseData) => {
        if (db && licensesCollectionPath) {
            try {
                await addDoc(collection(db, licensesCollectionPath), licenseData);
                setShowModal(false);
            } catch (error) {
                console.error("Error adding document: ", error);
            }
        }
    };

    const handleRenewLicense = async (updatedData) => {
        if (db && licenseToEdit) {
            try {
                const licenseRef = doc(db, licensesCollectionPath, licenseToEdit.id);
                await updateDoc(licenseRef, updatedData);
                setShowModal(false);
                setLicenseToEdit(null);
            } catch (error) {
                console.error("Error updating document: ", error);
            }
        }
    };
    
    const handleDeleteLicense = async (id) => {
        if(window.confirm("Are you sure you want to delete this license? This action cannot be undone.")){
             if (db && licensesCollectionPath) {
                try {
                    await deleteDoc(doc(db, licensesCollectionPath, id));
                } catch (error) {
                    console.error("Error deleting document: ", error);
                }
            }
        }
    };

    const handleSave = (data) => {
        if (licenseToEdit) {
            handleRenewLicense(data);
        } else {
            handleAddLicense(data);
        }
    };

    const handleRenewClick = (id) => {
        const license = licenses.find(l => l.id === id);
        setLicenseToEdit(license);
        setShowModal(true);
    };

    if (isLoading) {
        return <div className="bg-gray-100 min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
    }

    if (!userId) {
        return <AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} onPasswordReset={handlePasswordReset} />;
    }

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <style>{`.input-style { shadow: appearance-none; border-radius: 0.25rem; width: 100%; padding: 0.5rem 0.75rem; color: #4a5568; line-height: 1.25; border: 1px solid #e2e8f0; }`}</style>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
                <Header onSignOut={handleSignOut} />
                <main>
                    <FlashMessage licenses={licenses} onRenew={handleRenewClick} />
                    <LicenseList 
                        licenses={licenses} 
                        onRenew={handleRenewClick} 
                        onDelete={handleDeleteLicense}
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
            </div>
        </div>
    );
}
