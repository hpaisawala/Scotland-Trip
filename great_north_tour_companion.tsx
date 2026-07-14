import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, MapPin, Clock, Car, Utensils, CheckSquare, 
  ExternalLink, Check, Plus, Trash2, Calendar, Navigation,
  Map, Info, Edit3, Save, X, Image as ImageIcon
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Safely initialize Firebase to prevent blank page crashes on shared guest links
let app = null;
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gnt-companion-app';

try {
  const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  if (configStr && configStr.trim() !== '' && configStr !== '{}') {
    const firebaseConfig = JSON.parse(configStr);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.warn("Firebase config missing or invalid. App will run in local-only mode.");
}

// Robust Image Component that falls back to a placeholder if a link breaks
const SafeImage = ({ src, alt, className }) => {
  const fallbackSrc = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80";
  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (e.target.src !== fallbackSrc) e.target.src = fallbackSrc;
      }}
    />
  );
};

const INITIAL_ITINERARY = [
  {
    day: 1,
    date: 'Friday 21 August 2026',
    title: 'London to Stokesley',
    focus: 'Drive north via York',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/York_Minster_from_the_south-east.jpg',
    description: 'The journey begins. Drive north out of London towards the historic city of York, before settling into your base in Stokesley.',
    scenicDrive: {
      route: 'Approaching the Moors',
      details: 'After leaving York, you will travel up the A19, witnessing the transition into the rolling, lush green pasturelands of North Yorkshire.',
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/A19_Northbound_-_geograph.org.uk_-_2003732.jpg'
    },
    timeline: [
      { time: '10:00', activity: 'Depart London', type: 'travel', notes: 'Commence the drive north.', duration: 'About 4 hours driving' },
      { time: '~14:00', activity: 'Arrive York', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Goodramgate_York_-_geograph.org.uk_-_57636.jpg', maps: 'https://www.google.com/maps/search/?api=1&query=Goodramgate+York' },
      {
        time: '14:00 to 15:30', activity: 'Lunch, York', type: 'food',
        options: [
          { id: 'opt1', venue: 'Damastique', cuisine: 'Syrian, halal', rating: '4.7', suggestedOrder: 'The charcoal-grilled Shish Tawook chicken skewers and fresh hummus.', maps: 'https://www.google.com/maps/search/?api=1&query=Damastique+Goodramgate+York' }
        ]
      },
      { time: '15:30 to 16:15', activity: 'Supermarket stop, York', type: 'shopping', notes: 'Halal-labelled ranges, breakfasts, fruit and snacks.' },
      { time: '16:15', activity: 'Depart York', type: 'travel' },
      { time: '~17:10', activity: 'Arrive Stokesley', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Stokesley_High_Street_-_geograph.org.uk_-_1567119.jpg', notes: 'The Warren, Stokesley, Middlesbrough TS9 5AD.' },
      { time: 'Evening', activity: 'Settle in, cook from the cool box', type: 'food', options: [{ id: 'opt_cook1', venue: 'Home Cooking', cuisine: 'Self-catered', suggestedOrder: 'Cook using the supplies bought from the York supermarket.' }] }
    ]
  },
  {
    day: 2,
    date: 'Saturday 22 August 2026',
    title: 'North York Moors',
    focus: 'Sutton Bank, Kilburn White Horse, Rievaulx Terrace, Helmsley',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_from_Sutton_Bank_-_geograph.org.uk_-_1642230.jpg',
    description: 'A dedicated tour of the breathtaking North York Moors National Park, from cliff-edge viewpoints to historic forest walks and classic market towns.',
    timeline: [
      { time: '10:00', activity: 'Depart Stokesley', type: 'travel' },
      { time: '~10:30', activity: 'Sutton Bank visitor centre', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_from_Sutton_Bank_-_geograph.org.uk_-_1642230.jpg', notes: 'Level viewing platform over the Vale of York.' },
      { time: '11:30', activity: 'Kilburn White Horse car park', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Kilburn_White_Horse.jpg', notes: 'Close-up, ground-level view; minimal walking.' },
      { time: '11:45', activity: 'Depart for Rievaulx', type: 'travel' },
      { time: '~12:10 to 13:30', activity: 'Rievaulx Terrace', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rievaulx_Abbey_-_geograph.org.uk_-_1486756.jpg' },
      { time: '13:45', activity: 'Arrive Helmsley', type: 'landmark' },
      {
        time: '13:45 to 15:15', activity: 'Lunch, Helmsley', type: 'food',
        options: [
          { id: 'opt1', venue: 'Barkers Cafe Bar', cuisine: 'Vegetarian/Mediterranean', rating: '4.6', suggestedOrder: 'Warm vegetable wrap or quiche.', maps: 'https://www.google.com/maps/search/?api=1&query=Barkers+Cafe+Bar+Helmsley' },
          { id: 'opt2', venue: 'The Cafe on the Square', cuisine: 'British Tearoom', rating: '4.4', suggestedOrder: 'Fruit scones with clotted cream.', maps: 'https://www.google.com/maps/search/?api=1&query=Helmsley+Market+Place' }
        ]
      },
      { time: '15:15 to 16:00', activity: 'Free time, Helmsley', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Helmsley_Market_Place_-_geograph.org.uk_-_1068864.jpg' },
      { time: '16:00', activity: 'Depart for Stokesley', type: 'travel' },
      { time: '~16:40', activity: 'Arrive Stokesley', type: 'landmark' }
    ]
  },
  {
    day: 3,
    date: 'Sunday 23 August 2026',
    title: 'The Split Journey',
    focus: 'Group divides today',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dunnottar_Castle_-_panorama.jpg',
    description: 'Today the group splits based on your car selection.',
    isSplit: true,
    car1Timeline: [
      { time: '10:00', activity: 'Depart Stokesley', type: 'travel', notes: 'Heading to Scotland.' },
      { time: '~16:00', activity: 'Arrive Stonehaven area', type: 'travel' },
      { time: '16:00 to 16:30', activity: 'Dunnottar Castle', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dunnottar_Castle_-_panorama.jpg' },
      {
        time: '16:30 to 18:00', activity: 'Lunch, Stonehaven', type: 'food',
        options: [{ id: 'opt1', venue: 'The Bay Fish & Chips', cuisine: 'Kosher-compliant', rating: '4.7', suggestedOrder: 'Award-winning North Sea haddock and chips.', maps: 'https://www.google.com/maps/search/?api=1&query=The+Bay+Fish+Chips+Stonehaven' }]
      },
      { time: '18:00', activity: 'Depart for Banff', type: 'travel' },
      { time: '~19:30', activity: 'Arrive Banff', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Banff_Harbour_-_geograph.org.uk_-_1208941.jpg' },
      {
        time: 'Evening', activity: 'Dinner, Banff', type: 'food',
        options: [
          { id: 'opt1', venue: 'Pyramids Takeaway', cuisine: 'Egyptian, halal', rating: '4.5', suggestedOrder: 'Traditional Koshari or chicken shawarma.', maps: 'https://www.google.com/maps/search/?api=1&query=Pyramids+Takeaway+Banff' },
          { id: 'opt2', venue: 'The Knowes Hotel', cuisine: 'Scottish', rating: '4.5', suggestedOrder: 'Braised beef brisket.', maps: 'https://www.google.com/maps/search/?api=1&query=The+Knowes+Hotel+Macduff' }
        ]
      }
    ],
    car2Timeline: [
      { time: '10:00', activity: 'Depart Stokesley', type: 'travel', notes: 'Heading back to London.' },
      { time: '~13:00', activity: 'Arrive Peterborough', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Peterborough_Cathedral_West_Front.jpg' },
      {
        time: '13:00 to 14:30', activity: 'Lunch, Peterborough', type: 'food',
        options: [{ id: 'opt1', venue: 'Turkish Grill', cuisine: 'Turkish, halal', rating: '4.5', suggestedOrder: 'Mixed Shish Platter with rice and flatbread.', maps: 'https://www.google.com/maps/search/?api=1&query=Turkish+Grill+New+Road+Peterborough' }]
      },
      { time: '14:30', activity: 'Depart for London', type: 'travel' },
      { time: '~15:45 to 16:15', activity: 'Arrive London', type: 'landmark', notes: 'Trip complete for Car 2.' }
    ]
  },
  {
    day: 4,
    date: 'Monday 24 August 2026',
    title: 'Banff',
    focus: 'Chanonry Point, Pennan',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chanonry_Point_Lighthouse.jpg',
    description: 'Watch dolphins on the rising tide, drive along the rugged cliff edges, and explore the classic oceanfront village of Pennan.',
    timeline: [
      { time: '10:00', activity: 'Depart Banff', type: 'travel' },
      { time: '~11:15', activity: 'Arrive Chanonry Point', type: 'landmark', notes: 'Best chance of dolphins is on a rising tide.' },
      { time: '11:15 to 12:45', activity: 'Dolphin watching', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chanonry_Point_Lighthouse.jpg' },
      { time: '12:45', activity: 'Depart for Rosemarkie', type: 'travel' },
      {
        time: '~13:00 to 14:30', activity: 'Lunch, Rosemarkie', type: 'food',
        options: [{ id: 'opt1', venue: 'Crofters Cafe', cuisine: 'Kosher-compliant local fish', rating: '4.6', suggestedOrder: 'Local white fish cooked in vegetable oil.', maps: 'https://www.google.com/maps/search/?api=1&query=Crofters+Cafe+Rosemarkie' }]
      },
      { time: '14:30', activity: 'Depart for Pennan', type: 'travel' },
      { time: '~15:45', activity: 'Arrive Pennan', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pennan_-_geograph.org.uk_-_29146.jpg' },
      { time: '15:45 to 17:30', activity: 'Pennan', type: 'landmark', notes: 'Explore the row of cottages and the Local Hero phone box.' },
      { time: '17:30', activity: 'Depart for Banff', type: 'travel' },
      { time: '~18:00', activity: 'Arrive Banff', type: 'landmark' },
      {
        time: 'Evening', activity: 'Dinner, Banff', type: 'food',
        options: [{ id: 'opt1', venue: 'Pyramids Takeaway', cuisine: 'Egyptian, halal', rating: '4.5', suggestedOrder: 'Explore the rest of the menu.' }]
      }
    ]
  },
  {
    day: 5,
    date: 'Tuesday 25 August 2026',
    title: 'Banff to Newcastle',
    focus: 'Speyside Cooperage, Reindeer Centre',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Speyside_Cooperage_-_geograph.org.uk_-_1167474.jpg',
    description: 'Journey south through the heart of the Highlands before making the grand crossing into Newcastle.',
    timeline: [
      { time: '10:00', activity: 'Depart Banff', type: 'travel' },
      { time: '~10:45', activity: 'Arrive Speyside Cooperage', type: 'landmark' },
      { time: '10:45 to 11:45', activity: 'Speyside Cooperage', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Speyside_Cooperage_-_geograph.org.uk_-_1167474.jpg' },
      { time: '11:45', activity: 'Depart for Glenmore', type: 'travel' },
      { time: '~12:40', activity: 'Arrive Cairngorm Reindeer', type: 'landmark' },
      { time: '12:40 to 13:20', activity: 'Reindeer paddock', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Reindeer_in_the_Cairngorms_-_geograph.org.uk_-_3143521.jpg' },
      { time: '13:20', activity: 'Depart for Aviemore', type: 'travel' },
      {
        time: '~13:35 to 15:05', activity: 'Lunch, Aviemore', type: 'food',
        options: [
          { id: 'opt1', venue: 'Ryvoan Cafe', cuisine: 'Highland Cafe', rating: '4.8', suggestedOrder: 'Sourdough toasties and artisan buns.' },
          { id: 'opt2', venue: 'Route 7 Cafe', cuisine: 'Cafe', rating: '4.5', suggestedOrder: 'Quick hot lunch before the long drive.' }
        ]
      },
      { time: '15:05', activity: 'Depart for Newcastle', type: 'travel', notes: 'Direct route via the A9 and A68.' },
      { time: '~20:45', activity: 'Arrive Newcastle', type: 'landmark', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tyne_Bridge_from_the_Swing_Bridge.jpg' },
      {
        time: 'Evening', activity: 'Dinner, Newcastle', type: 'food',
        options: [{ id: 'opt1', venue: 'Rayyan Kurdish Cuisine', cuisine: 'Kurdish, halal', rating: '4.7', suggestedOrder: 'Quzi Lamb and fresh samoon bread.', maps: 'https://www.google.com/maps/search/?api=1&query=Rayyan+Kurdish+Cuisine+Newcastle' }]
      }
    ]
  },
  {
    day: 6,
    date: 'Wednesday 26 August 2026',
    title: 'Newcastle to home',
    focus: 'Marlow, then UB5 5HN',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Marlow_Bridge_-_geograph.org.uk_-_1400262.jpg',
    description: 'Drive south through the heart of England, pulling over in the beautiful riverside town of Marlow.',
    timeline: [
      { time: '10:00', activity: 'Depart Newcastle', type: 'travel' },
      { time: '~15:30', activity: 'Arrive Marlow', type: 'landmark' },
      {
        time: '15:30 to 17:30', activity: 'Marlow', type: 'food',
        options: [{ id: 'opt1', venue: 'Satollo', cuisine: 'Italian', rating: '4.6', suggestedOrder: 'Authentic Caprese panini and espresso.', maps: 'https://www.google.com/maps/search/?api=1&query=Satollo+Marlow' }]
      },
      { time: '17:30', activity: 'Depart for home', type: 'travel' },
      { time: '~18:45', activity: 'Arrive UB5 5HN', type: 'landmark', notes: 'Trip complete.' }
    ]
  }
];

const INITIAL_TASKS = [
  { id: 1, text: 'Confirm Stokesley accommodation booking ("The Warren")', completed: true, category: 'Stay' },
  { id: 2, text: 'Book Banff accommodation (near AB45 1HQ)', completed: false, category: 'Stay' },
  { id: 3, text: 'Book Newcastle West End accommodation', completed: false, category: 'Stay' },
  { id: 4, text: 'Pre-book Speyside Cooperage Tour', completed: false, category: 'Tours' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [itineraryData, setItineraryData] = useState(INITIAL_ITINERARY);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  
  // Safe local storage for Car Selection
  const [selectedCar, setSelectedCar] = useState(() => {
    try {
      return window.localStorage.getItem('gnt_car_selection') || 'Car 1';
    } catch (e) {
      return 'Car 1'; // Fallback for shared iframes
    }
  });

  // Safe local storage for Tasks
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = window.localStorage.getItem('gnt_tasks_2026');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch (e) {
      return INITIAL_TASKS; // Fallback for shared iframes
    }
  });

  const [newTaskText, setNewTaskText] = useState('');
  const dayRefs = useRef({});

  // Safely guarantee itinerary data is an array (protects against broken cloud data)
  const safeItineraryData = Array.isArray(itineraryData) && itineraryData.length > 0 ? itineraryData : INITIAL_ITINERARY;

  
  // Save preferences securely to local storage
  useEffect(() => {
    try { window.localStorage.setItem('gnt_car_selection', selectedCar); } catch (e) {}
  }, [selectedCar]);

  useEffect(() => {
    try { window.localStorage.setItem('gnt_tasks_2026', JSON.stringify(tasks)); } catch (e) {}
  }, [tasks]);

  // Authenticate with Firebase (if active)
  useEffect(() => {
    if (!auth) return; // Safely skip if running in local mode
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Auth initialization failed:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) setUser(u);
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  // Sync data with Cloud Firestore (if active)
  useEffect(() => {
    if (!user || !db) return; // Safely skip if not authenticated or no DB
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'itineraryData', 'main');
    
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().days) {
          setItineraryData(docSnap.data().days);
        } else {
          // Initialize DB structure if empty (gracefully catch if guest lacks write permissions)
          setDoc(docRef, { days: INITIAL_ITINERARY }, { merge: true })
            .catch(e => console.warn("Cannot initialize remote DB (read-only guest)"));
        }
      },
      (error) => console.warn("Firestore sync skipped:", error)
    );
    return () => unsubscribe();
  }, [user]);

  const saveToCloud = async (newData) => {
    setItineraryData(newData); // Immediate Optimistic UI update
    if (user && db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'itineraryData', 'main');
        await setDoc(docRef, { days: newData }, { merge: true });
      } catch (e) {
        console.warn("Failed to push to cloud, saving locally only.");
      }
    }
  };

  const handleUpdateImage = (dayIndex, timelineIndex, splitTimelineKey, newUrl) => {
    if (!newUrl) return;
    const newData = JSON.parse(JSON.stringify(safeItineraryData));
    if (timelineIndex === null) {
      newData[dayIndex].image = newUrl;
    } else {
      const targetTimeline = splitTimelineKey ? newData[dayIndex][splitTimelineKey] : newData[dayIndex].timeline;
      if (targetTimeline && targetTimeline[timelineIndex]) {
        targetTimeline[timelineIndex].image = newUrl;
      }
    }
    saveToCloud(newData);
  };

  const handleAddRestaurantOption = (dayIndex, timelineIndex, splitTimelineKey) => {
    const newData = JSON.parse(JSON.stringify(safeItineraryData));
    const targetTimeline = splitTimelineKey ? newData[dayIndex][splitTimelineKey] : newData[dayIndex].timeline;
    
    if (targetTimeline && targetTimeline[timelineIndex]) {
      if (!targetTimeline[timelineIndex].options) {
        targetTimeline[timelineIndex].options = [];
      }
      
      targetTimeline[timelineIndex].options.push({
        id: `opt_${Date.now()}`,
        venue: 'New Venue Option',
        cuisine: 'Cuisine type',
        rating: 'N/A',
        suggestedOrder: 'What to eat...',
        maps: ''
      });
      saveToCloud(newData);
    }
  };

  const handleUpdateRestaurantOption = (dayIndex, timelineIndex, splitTimelineKey, optionId, field, value) => {
    const newData = JSON.parse(JSON.stringify(safeItineraryData));
    const targetTimeline = splitTimelineKey ? newData[dayIndex][splitTimelineKey] : newData[dayIndex].timeline;
    
    if (targetTimeline && targetTimeline[timelineIndex] && targetTimeline[timelineIndex].options) {
      const optIndex = targetTimeline[timelineIndex].options.findIndex(o => o.id === optionId);
      if (optIndex > -1) {
        targetTimeline[timelineIndex].options[optIndex][field] = value;
        saveToCloud(newData);
      }
    }
  };

  const handleDeleteRestaurantOption = (dayIndex, timelineIndex, splitTimelineKey, optionId) => {
    const newData = JSON.parse(JSON.stringify(safeItineraryData));
    const targetTimeline = splitTimelineKey ? newData[dayIndex][splitTimelineKey] : newData[dayIndex].timeline;
    
    if (targetTimeline && targetTimeline[timelineIndex] && targetTimeline[timelineIndex].options) {
      targetTimeline[timelineIndex].options = targetTimeline[timelineIndex].options.filter(o => o.id !== optionId);
      saveToCloud(newData);
    }
  };

  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));
  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText, completed: false, category: 'General' }]);
    setNewTaskText('');
  };

  const scrollToDay = (dayNum) => {
    setActiveDay(dayNum);
    dayRefs.current[dayNum]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const completedCount = (tasks || []).filter(t => t.completed).length;
  const progressPercent = tasks && tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-md shadow-amber-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">THE GREAT NORTH TOUR</h1>
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Interactive Cloud Itinerary</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            
            {/* CAR SELECTOR - Master Layout Control */}
            <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 shadow-inner border border-slate-200">
              <button 
                onClick={() => setSelectedCar('Car 1')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedCar === 'Car 1' 
                    ? 'bg-white text-amber-700 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Car className="w-4 h-4" />
                Car 1 (Scotland)
              </button>
              <button 
                onClick={() => setSelectedCar('Car 2')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedCar === 'Car 2' 
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Car className="w-4 h-4" />
                Car 2 (London)
              </button>
            </div>

            {/* EDIT MODE TOGGLE */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                isEditing 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Exit Edit Mode' : 'Enable Editing'}
            </button>

          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {isEditing && (
          <div className="mb-6 bg-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-pulse">
            <Edit3 className="w-5 h-5" />
            Edit Mode is Active. You can now change photos, add multi-option restaurants, and plan your orders. Changes automatically sync via the cloud.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Navigation & Tasks */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-xs mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-amber-500" />
                Jump to Day
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 gap-2">
                {safeItineraryData.map((d) => {
                  const disabled = selectedCar === 'Car 2' && d.day > 3;
                  return (
                    <button
                      key={d.day}
                      disabled={disabled}
                      onClick={() => scrollToDay(d.day)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        disabled 
                          ? 'opacity-30 bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' 
                          : activeDay === d.day
                            ? 'bg-amber-500 border-amber-500 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${activeDay === d.day ? 'text-amber-100' : 'text-slate-400'}`}>
                        Day {d.day}
                      </div>
                      <div className="text-xs truncate font-bold mt-1">
                        {d.day === 3 && selectedCar === 'Car 2' ? 'To London' : d.title.split(',')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckSquare className="w-4 h-4 text-amber-500" />
                    Local Checklist
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(tasks || []).map((task) => (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-2xl transition-all border ${task.completed ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <button onClick={() => toggleTask(task.id)} className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all border ${task.completed ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <div className="flex-1 text-xs leading-relaxed font-semibold">{task.text}</div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={addTask} className="pt-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Add task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                />
                <button type="submit" className="bg-slate-900 text-white rounded-xl px-4 text-xs font-bold flex items-center shadow-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Dynamic Itinerary Feed */}
          <div className="lg:col-span-8 space-y-10">
            
            {safeItineraryData.map((dayObj, dayIndex) => {
              // Master Routing Check
              if (selectedCar === 'Car 2' && dayObj.day > 3) return null;

              const isSplitDay = dayObj.isSplit;
              let activeTimeline = dayObj.timeline || [];
              let splitTimelineKey = null;
              let dayTitle = dayObj.title || `Day ${dayObj.day}`;
              
              if (isSplitDay) {
                if (selectedCar === 'Car 1') {
                  activeTimeline = dayObj.car1Timeline || dayObj.timeline || [];
                  splitTimelineKey = 'car1Timeline';
                  dayTitle = "Stokesley to Banff";
                } else {
                  activeTimeline = dayObj.car2Timeline || dayObj.timeline || [];
                  splitTimelineKey = 'car2Timeline';
                  dayTitle = "Stokesley to London";
                }
              }

              return (
                <div 
                  key={dayObj.day}
                  ref={(el) => dayRefs.current[dayObj.day] = el}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 scroll-mt-24"
                >
                  
                  {/* Visual Day Banner */}
                  <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-slate-800 group">
                    <SafeImage 
                      src={dayObj.image} 
                      alt={dayTitle}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    
                    {/* Inline Image Edit Capability */}
                    {isEditing && (
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-xl flex items-center gap-2 shadow-lg z-10">
                         <ImageIcon className="w-4 h-4 text-slate-700" />
                         <input 
                           type="text" 
                           placeholder="Paste new image URL..." 
                           className="text-xs px-2 py-1 border rounded w-48 focus:outline-none"
                           onBlur={(e) => handleUpdateImage(dayIndex, null, null, e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleUpdateImage(dayIndex, null, null, e.target.value)}
                         />
                      </div>
                    )}

                    <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Day {dayObj.day} • {dayObj.date}
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
                      <p className="text-[10px] uppercase font-bold text-amber-400 tracking-widest flex items-center gap-2">
                        {isSplitDay ? `ROUTE: ${selectedCar}` : `FOCUS: ${dayObj.focus}`}
                      </p>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{dayTitle}</h2>
                      <p className="text-sm text-slate-200 max-w-2xl leading-relaxed font-medium opacity-90">{dayObj.description}</p>
                    </div>
                  </div>

                  {/* Feed Elements */}
                  <div className="p-8 space-y-8 bg-slate-50/30">
                    {(activeTimeline || []).map((item, timelineIndex) => {
                      const isFood = item.type === 'food';
                      const isTravel = item.type === 'travel';

                      return (
                        <div key={timelineIndex} className="relative flex gap-6 items-start group">
                          
                          {/* Left Connection Line */}
                          <div className="flex flex-col items-center h-full absolute left-0 top-0 -bottom-8">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 ${
                              isFood ? 'bg-amber-500 text-white' : isTravel ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white'
                            }`}>
                              {isFood ? <Utensils className="w-4 h-4" /> : isTravel ? <Car className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>
                            {timelineIndex !== activeTimeline.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-2"></div>}
                          </div>

                          <div className="flex-1 ml-14 bg-white border border-slate-200 rounded-[1.5rem] p-5 sm:p-6 shadow-sm">
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  {item.time}
                                </span>
                                <h4 className="text-base font-extrabold text-slate-900">{item.activity}</h4>
                              </div>
                            </div>

                            {/* Standard Image with Hover Edit Overlay */}
                            {item.image && (
                              <div className="my-4 rounded-2xl overflow-hidden h-48 sm:h-64 w-full relative group/img">
                                <SafeImage src={item.image} alt={item.activity} className="w-full h-full object-cover" />
                                {isEditing && (
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                     <div className="bg-white p-2 rounded-xl flex gap-2">
                                       <input 
                                         type="text" placeholder="New image URL..." 
                                         className="text-xs px-2 py-1 border rounded w-48"
                                         onBlur={(e) => handleUpdateImage(dayIndex, timelineIndex, splitTimelineKey, e.target.value)}
                                         onKeyDown={(e) => e.key === 'Enter' && handleUpdateImage(dayIndex, timelineIndex, splitTimelineKey, e.target.value)}
                                       />
                                     </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {item.notes && <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.notes}</p>}

                            {/* Multi-Option Dynamic Restaurants Block */}
                            {isFood && Array.isArray(item.options) && (
                              <div className="mt-5 space-y-4">
                                {item.options.map((opt) => (
                                  <div key={opt.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group/opt">
                                    
                                    {isEditing && (
                                      <button 
                                        onClick={() => handleDeleteRestaurantOption(dayIndex, timelineIndex, splitTimelineKey, opt.id)}
                                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      {isEditing ? (
                                        <input 
                                          type="text" value={opt.venue} 
                                          onChange={(e) => handleUpdateRestaurantOption(dayIndex, timelineIndex, splitTimelineKey, opt.id, 'venue', e.target.value)}
                                          className="text-sm font-extrabold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                                        />
                                      ) : (
                                        <h5 className="text-sm font-extrabold text-slate-900">{opt.venue}</h5>
                                      )}
                                      
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">★ {opt.rating}</span>
                                      
                                      {isEditing ? (
                                        <input 
                                          type="text" value={opt.cuisine} 
                                          onChange={(e) => handleUpdateRestaurantOption(dayIndex, timelineIndex, splitTimelineKey, opt.id, 'cuisine', e.target.value)}
                                          className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 rounded px-2 py-1"
                                        />
                                      ) : (
                                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg">{opt.cuisine}</span>
                                      )}
                                    </div>

                                    {/* Editable "Plan to eat" section */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                                        <Utensils className="w-3 h-3" /> Plan to eat:
                                      </span>
                                      {isEditing ? (
                                        <textarea 
                                          value={opt.suggestedOrder} 
                                          onChange={(e) => handleUpdateRestaurantOption(dayIndex, timelineIndex, splitTimelineKey, opt.id, 'suggestedOrder', e.target.value)}
                                          className="w-full text-xs text-slate-800 font-bold italic bg-slate-50 border border-slate-200 rounded p-2 focus:ring-amber-500"
                                          rows={2}
                                        />
                                      ) : (
                                        <p className="text-sm text-slate-800 font-bold italic">"{opt.suggestedOrder}"</p>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {isEditing && (
                                  <button 
                                    onClick={() => handleAddRestaurantOption(dayIndex, timelineIndex, splitTimelineKey)}
                                    className="w-full py-2.5 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-50"
                                  >
                                    <Plus className="w-4 h-4" /> Add Restaurant Option
                                  </button>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </main>

    </div>
  );
}