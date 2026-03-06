import {isServer} from 'solid-js/web';
import {initializeApp} from 'firebase/app';
import {connectAuthEmulator, getAuth, signInAnonymously} from 'firebase/auth';
import {
	getFirestore,
	connectFirestoreEmulator,
	collection,
	type CollectionReference,
} from 'firebase/firestore';
import {
	getFunctions,
	connectFunctionsEmulator,
	httpsCallable,
} from 'firebase/functions';
import type {Room} from './schema.ts';

const firebaseConfigResponse = await fetch('/__/firebase/init.json');
const firebaseConfig = await firebaseConfigResponse.json();

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const functions = getFunctions(app);
const functionsTokyo = getFunctions(app, 'asia-northeast1');
const functionsOsaka = getFunctions(app, 'asia-northeast2');
const functionsEurope = getFunctions(app, 'europe-west1');
const functionsUscentral = getFunctions(app, 'us-central1');
const functionsAfrica = getFunctions(app, 'africa-south1');

if (import.meta.env.DEV && !isServer) {
	connectFirestoreEmulator(db, 'localhost', 8180);
	connectAuthEmulator(auth, 'http://localhost:9099');
	for (const fn of [
		functions,
		functionsTokyo,
		functionsOsaka,
		functionsEurope,
		functionsUscentral,
		functionsAfrica,
	]) {
		connectFunctionsEmulator(fn, 'localhost', 5001);
	}
}

const getServerTimeTokyo = httpsCallable<never, {serverTime: number}>(
	functionsTokyo,
	'getServerTimeTokyo',
);
const getServerTimeOsaka = httpsCallable<never, {serverTime: number}>(
	functionsOsaka,
	'getServerTimeOsaka',
);
const getServerTimeEurope = httpsCallable<never, {serverTime: number}>(
	functionsEurope,
	'getServerTimeEurope',
);
const getServerTimeUscentral = httpsCallable<never, {serverTime: number}>(
	functionsUscentral,
	'getServerTimeUscentral',
);
const getServerTimeAfrica = httpsCallable<never, {serverTime: number}>(
	functionsAfrica,
	'getServerTimeAfrica',
);

const Rooms = collection(db, 'rooms') as CollectionReference<Room>;

await signInAnonymously(auth);

export {
	app as default,
	auth,
	db,
	Rooms,
	functions,
	getServerTimeTokyo,
	getServerTimeOsaka,
	getServerTimeEurope,
	getServerTimeUscentral,
	getServerTimeAfrica,
};
