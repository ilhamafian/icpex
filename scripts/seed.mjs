// Seeds realistic sample data for local development.
// Usage: npm run seed   (reads MONGODB_URI / DB_NAME from .env)
// Idempotent: existing records (matched by slug, email, or project title) are left untouched.

import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";

const scryptAsync = promisify(scrypt);

const DEV_PASSWORD = "Icpex@2026";
const BLOB_HOST = "https://njnizxuhya6milsk.private.blob.vercel-storage.com";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "item";
}

function blobUrl(folder, fileName) {
  const dot = fileName.lastIndexOf(".");
  const base = fileName.slice(0, dot);
  const ext = fileName.slice(dot);
  const suffix = randomBytes(15).toString("base64url").slice(0, 30);
  return `${BLOB_HOST}/${folder}/${encodeURIComponent(base)}-${suffix}${ext}`;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Data Analytics",
  "Artificial Intelligence & Machine Learning",
  "Internet of Things",
  "Cybersecurity",
  "Sustainable Energy & Green Technology",
  "Health & Biomedical Technology",
  "Smart Manufacturing & Industry 4.0",
  "Education Technology",
  "Creative Multimedia & Digital Content",
  "Social Innovation",
];

// ---------------------------------------------------------------------------
// Judge criteria (weights per type sum to 100, including existing entries)
// ---------------------------------------------------------------------------

const JUDGE_CRITERIA = [
  {
    name: "Originality",
    description:
      "Novelty of the research problem, approach, or findings compared to existing work in the field.",
    weight: 25,
    type: "THESIS",
  },
  {
    name: "Research Methodology",
    description:
      "Soundness of the research design, data collection, and analysis methods, and whether they are appropriate for the stated objectives.",
    weight: 25,
    type: "THESIS",
  },
  {
    name: "Technical Implementation",
    description:
      "Quality and completeness of the prototype, experiments, or technical solution presented.",
    weight: 20,
    type: "THESIS",
  },
  {
    name: "Impact & Significance",
    description:
      "Potential contribution to industry, society, or the body of knowledge, including commercialisation potential.",
    weight: 15,
    type: "THESIS",
  },
  {
    name: "Presentation & Documentation",
    description:
      "Clarity of the written report, figures, and citations, and adherence to academic writing standards.",
    weight: 15,
    type: "THESIS",
  },
  {
    name: "Authenticity",
    description:
      "Content is the team's own original work, with all third-party material properly credited.",
    weight: 30,
    type: "EBOOK",
  },
  {
    name: "Content Accuracy",
    description:
      "Factual correctness and depth of the subject matter, appropriate for the intended audience.",
    weight: 25,
    type: "EBOOK",
  },
  {
    name: "Visual Design & Layout",
    description:
      "Consistency of typography, colour, illustrations, and page layout across the e-book.",
    weight: 20,
    type: "EBOOK",
  },
  {
    name: "Readability & Language",
    description:
      "Clear structure, correct grammar, and a reading level suited to the target readers.",
    weight: 15,
    type: "EBOOK",
  },
  {
    name: "Interactivity & Multimedia",
    description:
      "Effective use of embedded audio, video, quizzes, or links to enhance engagement.",
    weight: 10,
    type: "EBOOK",
  },
];

// ---------------------------------------------------------------------------
// Portal users (judges & secretariat)
// ---------------------------------------------------------------------------

const USERS = [
  {
    name: "Nurul Izzati binti Kamarudin",
    email: "nurulizzati.kamarudin@unikl.edu.my",
    roles: ["SECRETARY"],
    status: "ACTIVE",
  },
  {
    name: "Farah Hanim binti Zulkifli",
    email: "farahhanim.zulkifli@unikl.edu.my",
    roles: ["SECRETARY"],
    status: "ACTIVE",
  },
  {
    name: "Ts. Dr. Azlan bin Hashim",
    email: "azlan.hashim@unikl.edu.my",
    roles: ["THESIS_JUDGE"],
    status: "ACTIVE",
  },
  {
    name: "Prof. Madya Dr. Siti Aishah binti Rahman",
    email: "sitiaishah.rahman@unikl.edu.my",
    roles: ["THESIS_JUDGE", "EBOOK_JUDGE"],
    status: "ACTIVE",
  },
  {
    name: "Dr. Lim Wei Chen",
    email: "lim.weichen@utm.my",
    roles: ["THESIS_JUDGE"],
    status: "ACTIVE",
  },
  {
    name: "Dr. Priya a/p Ramasamy",
    email: "priya.ramasamy@um.edu.my",
    roles: ["EBOOK_JUDGE"],
    status: "ACTIVE",
  },
  {
    name: "Encik Mohd Hafiz bin Othman",
    email: "mhafiz.othman@unikl.edu.my",
    roles: ["EBOOK_JUDGE"],
    status: "ACTIVE",
  },
  {
    email: "rajeshkumar.s@usm.my",
    roles: ["THESIS_JUDGE"],
    status: "INVITED",
    inviteExpiresInDays: 5,
  },
  {
    email: "tan.meiling@upm.edu.my",
    roles: ["EBOOK_JUDGE"],
    status: "INVITED",
    inviteExpiresInDays: -2,
  },
  {
    name: "Mohd Faizal bin Ismail",
    email: "mfaizal.ismail@unikl.edu.my",
    roles: ["SECRETARY"],
    status: "DISABLED",
  },
];

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

const MY = "Malaysia";

const REGISTRATIONS = [
  {
    category: "Artificial Intelligence & Machine Learning",
    participant: {
      name: "Muhammad Aiman bin Rosli",
      email: "aiman.rosli@s.unikl.edu.my",
      phone: "0172839410",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "020514101235" },
    },
    project: {
      title:
        "Early Detection of Paddy Leaf Blast Using a Lightweight CNN on Edge Devices",
      abstract:
        "Rice blast disease causes yield losses of up to 30% for smallholder farmers in Kedah and Perlis. This project trains a MobileNetV3-based classifier on 6,200 field images of paddy leaves and deploys it on a Raspberry Pi 4 for offline inference. The model achieves 94.1% accuracy across four disease classes and delivers results within 180 ms, enabling farmers to act before the infection spreads.",
    },
    members: [
      { name: "Nur Irdina binti Azhar", email: "irdina.azhar@s.unikl.edu.my" },
      { name: "Daniel Lim Zhi Hao", email: "daniel.lim@s.unikl.edu.my" },
    ],
    supervisors: [
      { name: "Ts. Dr. Norhayati binti Ahmad", email: "norhayati.ahmad@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION", "PROJECT_VIDEO"],
    status: "ACCEPTED",
  },
  {
    category: "Internet of Things",
    participant: {
      name: "Tan Jia Hui",
      email: "jiahui.tan01@gmail.com",
      phone: "0126654321",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Teknologi Malaysia", country: MY },
      government_id: { type: "NATIONAL_ID", number: "011122010468" },
    },
    project: {
      title:
        "Smart Aquaponics Monitoring System with LoRaWAN and Automated pH Control",
      abstract:
        "Small-scale aquaponics farms often lose fish stock due to undetected changes in water quality. We designed a solar-powered sensor node that measures pH, dissolved oxygen, ammonia, and temperature, transmitting readings over LoRaWAN to a cloud dashboard. A peristaltic dosing pump automatically corrects pH drift, reducing manual intervention by 70% during a 12-week pilot in Skudai, Johor.",
    },
    members: [
      { name: "Goh Kai Xuan", email: "kaixuan.goh@graduate.utm.my" },
    ],
    supervisors: [
      { name: "Dr. Mohd Ridzuan bin Ahmad", email: "ridzuan.ahmad@utm.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PHOTO"],
    status: "ACCEPTED",
  },
  {
    category: "Sustainable Energy & Green Technology",
    participant: {
      name: "Ahmad Danial Hakimi bin Zulkarnain",
      email: "danialhakimi.z@yahoo.com",
      phone: "0139876012",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Teknologi MARA", country: MY },
      government_id: { type: "NATIONAL_ID", number: "040209110157" },
    },
    project: {
      title: "Solar-Powered Cold Storage for Rural Fishermen in Kuala Terengganu",
      abstract:
        "Fishermen in coastal villages lack affordable refrigeration, forcing them to sell their catch at low prices immediately after landing. This project builds a 200-litre insulated cold box powered by a 400 W photovoltaic array and a DC compressor with phase-change thermal storage. Field tests maintained temperatures below 4°C for 18 hours without grid power.",
    },
    members: [
      { name: "Muhammad Irfan bin Rashid", email: "irfanrashid04@gmail.com" },
      { name: "Wan Nur Alya binti Wan Hassan", email: "alya.wanhassan@gmail.com" },
    ],
    supervisors: [
      { name: "Ir. Dr. Zulkifli bin Mat Yasin", email: "zulkifli.my@uitm.edu.my" },
    ],
    documents: ["PROJECT_REPORT"],
    status: "REJECTED",
  },
  {
    category: "Health & Biomedical Technology",
    participant: {
      name: "Kavitha a/p Muniandy",
      email: "kavitha.muniandy@student.usm.my",
      phone: "0164412987",
      education_level: "POSTGRADUATE",
      institution: { name: "Universiti Sains Malaysia", country: MY },
      government_id: { type: "NATIONAL_ID", number: "970603075218" },
    },
    project: {
      title:
        "Wearable ECG Patch for Continuous Arrhythmia Screening Using Federated Learning",
      abstract:
        "Atrial fibrillation is frequently undiagnosed because episodes are intermittent. We present a flexible single-lead ECG patch paired with a smartphone app that detects arrhythmia on-device. Models are improved through federated learning so raw patient data never leaves the phone. Validation on the MIT-BIH dataset and 42 volunteers at Hospital USM achieved a sensitivity of 96.3%.",
    },
    members: [],
    supervisors: [
      { name: "Prof. Dr. Mohd Zaid bin Abdullah", email: "mza@usm.my" },
      { name: "Dr. Chew Boon Hock", email: "chewbh@usm.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION", "PROJECT_DEMO"],
    status: "ACCEPTED",
  },
  {
    category: "Cybersecurity",
    participant: {
      name: "Rizky Pratama",
      email: "rizky.pratama@ui.ac.id",
      phone: "+62 812-3456-7821",
      education_level: "POSTGRADUATE",
      institution: { name: "Universitas Indonesia", country: "Indonesia" },
      government_id: { type: "PASSPORT", number: "C4821937" },
    },
    project: {
      title: "Phishing URL Detection Using Transformer-Based Character Embeddings",
      abstract:
        "Phishing campaigns targeting Indonesian e-wallet users increased by 250% in 2025. This work proposes a character-level transformer that classifies URLs without relying on third-party blacklists or page content. Trained on 1.2 million labelled URLs, the model reaches an F1-score of 0.978 and runs as a browser extension with under 20 ms latency.",
    },
    members: [
      { name: "Anisa Putri Rahmawati", email: "anisa.putri@ui.ac.id" },
    ],
    supervisors: [
      { name: "Dr. Bayu Anggorojati", email: "bayu.anggorojati@cs.ui.ac.id" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "ACCEPTED",
  },
  {
    category: "Data Analytics",
    participant: {
      name: "Nur Aqilah binti Mohd Hisham",
      email: "aqilah.hisham@siswa.ukm.edu.my",
      phone: "0197723401",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kebangsaan Malaysia", country: MY },
      government_id: { type: "NATIONAL_ID", number: "020911140392" },
    },
    project: {
      title:
        "Predicting Student Dropout Risk in Malaysian Public Universities Using Explainable Machine Learning",
      abstract:
        "Early identification of at-risk students allows faculties to intervene before students withdraw. Using five years of anonymised academic and financial-aid records, we compare gradient boosting, random forest, and logistic regression models, and apply SHAP to explain individual predictions. The final model flags 81% of eventual dropouts by the end of the first semester.",
    },
    members: [
      { name: "Aisyah Humaira binti Rosdi", email: "aisyah.rosdi@siswa.ukm.edu.my" },
      { name: "Lee Hui Wen", email: "huiwen.lee@siswa.ukm.edu.my" },
    ],
    supervisors: [
      { name: "Dr. Nor Samsiah binti Sani", email: "norsamsiahsani@ukm.edu.my" },
    ],
    documents: ["PROJECT_REPORT"],
    status: "REVIEWING",
  },
  {
    category: "Education Technology",
    participant: {
      name: "Siti Khadijah binti Abdullah",
      email: "khadijah.abdullah@siswa.upsi.edu.my",
      phone: "0145567823",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Pendidikan Sultan Idris", country: MY },
      government_id: { type: "NATIONAL_ID", number: "010427030664" },
    },
    project: {
      title: "AR-Based Jawi Learning Application for Primary School Pupils",
      abstract:
        "Many Year 1 pupils struggle to recognise Jawi letters and their positional forms. This Android application overlays 3D animated characters on printed flashcards using augmented reality, with audio pronunciation and tracing exercises. A quasi-experimental study with 64 pupils in Tanjung Malim showed a 27% improvement in post-test scores over the control group.",
    },
    members: [
      { name: "Nur Farhana binti Ismail", email: "farhana.ismail@siswa.upsi.edu.my" },
    ],
    supervisors: [
      { name: "Dr. Mazlina binti Che Mustafa", email: "mazlina.cm@fpm.upsi.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_DEMO", "PROJECT_VIDEO"],
    status: "ACCEPTED",
  },
  {
    category: "Smart Manufacturing & Industry 4.0",
    participant: {
      name: "Lee Jun Wei",
      email: "junwei.lee@s.unikl.edu.my",
      phone: "0187765409",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "030718080571" },
    },
    project: {
      title: "Vision-Based Defect Inspection for PCB Assembly Lines",
      abstract:
        "Manual visual inspection of printed circuit boards is slow and inconsistent across shifts. We built an inspection station using an industrial camera and a YOLOv8 model to detect missing components, solder bridges, and misalignment. Integrated with the line's PLC, the system rejects defective boards automatically at 40 boards per minute.",
    },
    members: [
      { name: "Muhammad Hakim bin Rahman", email: "hakim.rahman@s.unikl.edu.my" },
    ],
    supervisors: [
      { name: "Ts. Mohd Azri bin Mohd Yusoff", email: "azri.yusoff@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PHOTO"],
    status: "REJECTED",
  },
  {
    category: "Creative Multimedia & Digital Content",
    participant: {
      name: "Aina Sofea binti Kamal",
      email: "ainasofea.kamal@gmail.com",
      phone: "0112398476",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "021203100886" },
    },
    project: {
      title:
        "Interactive E-Book on Malaysian Traditional Games for Early Childhood Education",
      abstract:
        "Traditional games such as congkak, gasing, and batu seremban are rarely played by today's children. This bilingual interactive e-book introduces eight traditional games through illustrated stories, narrated audio, and mini-games. Usability testing with 30 preschoolers and their parents rated it 4.6 out of 5 for engagement.",
    },
    members: [
      { name: "Nurin Batrisyia binti Faizal", email: "nurinbatrisyia@gmail.com" },
      { name: "Chloe Ng Xin Yi", email: "chloe.ngxy@gmail.com" },
    ],
    supervisors: [
      { name: "Puan Rohaya binti Abdul Wahab", email: "rohaya.wahab@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_OTHER"],
    status: "REVIEWING",
  },
  {
    category: "Social Innovation",
    participant: {
      name: "Nguyen Thi Minh Anh",
      email: "minhanh.nguyen@vnu.edu.vn",
      phone: "+84 912 345 678",
      education_level: "UNDERGRADUATE",
      institution: { name: "Vietnam National University, Hanoi", country: "Vietnam" },
      government_id: { type: "PASSPORT", number: "C7392846" },
    },
    project: {
      title: "Community-Driven Food Waste Redistribution Platform for Urban Hanoi",
      abstract:
        "Restaurants and markets in Hanoi discard tonnes of edible food daily while many low-income households face food insecurity. Our platform matches surplus food donors with verified community kitchens through a mobile app with route optimisation for volunteer drivers. In a three-month pilot across two districts, 4.8 tonnes of food were redistributed.",
    },
    members: [
      { name: "Tran Duc Minh", email: "ducminh.tran@vnu.edu.vn" },
      { name: "Pham Thu Ha", email: "thuha.pham@vnu.edu.vn" },
    ],
    supervisors: [
      { name: "Assoc. Prof. Le Thanh Ha", email: "ltha@vnu.edu.vn" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "REVIEWING",
  },
  {
    category: "Artificial Intelligence & Machine Learning",
    participant: {
      name: "Arjun Nair a/l Gopal",
      email: "arjun.gopal@student.mmu.edu.my",
      phone: "0123381902",
      education_level: "POSTGRADUATE",
      institution: { name: "Multimedia University", country: MY },
      government_id: { type: "NATIONAL_ID", number: "980115145523" },
    },
    project: {
      title:
        "Bahasa Melayu Speech-to-Text for Low-Resource Dialects Using Wav2Vec 2.0",
      abstract:
        "Commercial speech recognition systems perform poorly on regional Malay dialects such as Kelantanese and Terengganuan. We collected 85 hours of dialect speech and fine-tuned a multilingual Wav2Vec 2.0 model with a dialect-aware language model. Word error rate decreased from 48% to 19% compared to the baseline.",
    },
    members: [],
    supervisors: [
      { name: "Dr. Tan Tien Ping", email: "tptan@mmu.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_DEMO"],
    status: "REVIEWING",
  },
  {
    category: "Internet of Things",
    participant: {
      name: "Mohd Syafiq bin Hamzah",
      email: "syafiqhamzah03@gmail.com",
      phone: "0104456721",
      education_level: "UNDERGRADUATE",
      institution: { name: "Politeknik Ungku Omar", country: MY },
      government_id: { type: "DRIVING_LICENSE", number: "D0348821" },
    },
    project: {
      title:
        "Low-Cost Flood Early Warning System Using Ultrasonic Sensors and Telegram Alerts",
      abstract:
        "Flash floods in Ipoh's low-lying residential areas often give residents little time to evacuate. This system monitors river levels with weatherproof ultrasonic sensors connected to ESP32 boards, sending tiered Telegram alerts to residents and the local JKKK. Each node costs under RM150, making it affordable for community-led deployment.",
    },
    members: [
      { name: "Muhammad Aqil bin Norazman", email: "aqilnorazman@gmail.com" },
      { name: "Nur Syahirah binti Mazlan", email: "syahirah.mazlan@gmail.com" },
    ],
    supervisors: [
      { name: "Encik Kamarul Ariffin bin Ahmad", email: "kamarul@puo.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PHOTO", "PROJECT_VIDEO"],
    status: "ACCEPTED",
  },
  {
    category: "Health & Biomedical Technology",
    participant: {
      name: "Farhana binti Yusof",
      email: "gs61234@student.upm.edu.my",
      phone: "0193347812",
      education_level: "POSTGRADUATE",
      institution: { name: "Universiti Putra Malaysia", country: MY },
      government_id: { type: "NATIONAL_ID", number: "910822065034" },
    },
    project: {
      title:
        "Nanocellulose-Based Wound Dressing from Oil Palm Empty Fruit Bunch",
      abstract:
        "Oil palm empty fruit bunches are an abundant agricultural waste in Malaysia. This research extracts cellulose nanofibrils from EFB and crosslinks them with chitosan and silver nanoparticles to produce an antibacterial hydrogel dressing. In vivo studies showed 35% faster wound closure than commercial gauze.",
    },
    members: [],
    supervisors: [
      { name: "Prof. Dr. Paridah binti Md Tahir", email: "parida@upm.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "REVIEWING",
  },
  {
    category: "Sustainable Energy & Green Technology",
    participant: {
      name: "Somchai Wongsakul",
      email: "somchai.w@student.chula.ac.th",
      phone: "+66 81 234 5678",
      education_level: "POSTGRADUATE",
      institution: { name: "Chulalongkorn University", country: "Thailand" },
      government_id: { type: "PASSPORT", number: "AA3928174" },
    },
    project: {
      title:
        "Biochar from Durian Husk for Heavy Metal Removal in Industrial Wastewater",
      abstract:
        "Thailand generates over 500,000 tonnes of durian husk annually, most of which ends up in landfills. We convert husk into biochar via slow pyrolysis and activate it with KOH to adsorb lead and cadmium from electroplating wastewater. The biochar removed 92% of Pb(II) in batch tests and remained effective over five regeneration cycles.",
    },
    members: [
      { name: "Kanokwan Srisuk", email: "kanokwan.s@student.chula.ac.th" },
    ],
    supervisors: [
      { name: "Assoc. Prof. Dr. Nuttakorn Intaravicha", email: "nuttakorn.i@chula.ac.th" },
    ],
    documents: ["PROJECT_REPORT"],
    status: "REVIEWING",
  },
  {
    category: "Data Analytics",
    participant: {
      name: "Chong Wai Kit",
      email: "waikit.chong@sd.taylors.edu.my",
      phone: "0167789034",
      education_level: "UNDERGRADUATE",
      institution: { name: "Taylor's University", country: MY },
      government_id: { type: "NATIONAL_ID", number: "030305140811" },
    },
    project: {
      title: "Real-Time Dengue Outbreak Forecasting Using Climate and Mobility Data",
      abstract:
        "Dengue remains a major public health burden in Selangor. This dashboard combines weekly case data from iDengue, rainfall and temperature from MetMalaysia, and anonymised mobility indices to forecast hotspots two weeks ahead using an LSTM model. It achieved a mean absolute error of 6.2 cases per locality.",
    },
    members: [
      { name: "Sarah Tan Li Ying", email: "sarah.tanly@sd.taylors.edu.my" },
    ],
    supervisors: [
      { name: "Dr. Raja Kumar Murugesan", email: "rajakumar.murugesan@taylors.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "REJECTED",
  },
  {
    category: "Cybersecurity",
    participant: {
      name: "Haziq Irfan bin Azman",
      email: "haziq.azman@s.unikl.edu.my",
      phone: "0138892341",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "020130100319" },
    },
    project: {
      title: "Blockchain-Based Academic Credential Verification System",
      abstract:
        "Fake degree certificates remain a recurring problem for employers in Malaysia. This system issues tamper-proof digital certificates as hashes on a permissioned Hyperledger Fabric network, with QR codes that employers can scan for instant verification. A prototype was tested with 500 mock graduate records from the registrar's office.",
    },
    members: [
      { name: "Ahmad Luqman bin Hairul", email: "luqman.hairul@s.unikl.edu.my" },
      { name: "Nur Athirah binti Saiful", email: "athirah.saiful@s.unikl.edu.my" },
    ],
    supervisors: [
      { name: "Dr. Nurul Hidayah binti Ab Rahman", email: "nurulhidayah@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_DEMO"],
    status: "REVIEWING",
  },
  {
    category: "Education Technology",
    participant: {
      name: "Maria Clara Santos",
      email: "mcsantos@mymail.mapua.edu.ph",
      phone: "+63 917 845 2310",
      education_level: "UNDERGRADUATE",
      institution: { name: "Mapúa University", country: "Philippines" },
      government_id: { type: "PASSPORT", number: "P4829173A" },
    },
    project: {
      title: "Gamified Mobile App for Filipino Sign Language Literacy",
      abstract:
        "Few hearing Filipinos can communicate in Filipino Sign Language, isolating Deaf community members. This app teaches FSL through short video lessons, a camera-based sign recognition quiz powered by MediaPipe, and daily streak rewards. Beta testers learned an average of 120 signs in four weeks.",
    },
    members: [
      { name: "John Paolo Reyes", email: "jpreyes@mymail.mapua.edu.ph" },
    ],
    supervisors: [
      { name: "Engr. Ramon G. Garcia", email: "rggarcia@mapua.edu.ph" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_VIDEO"],
    status: "SUBMITTED",
  },
  {
    category: "Smart Manufacturing & Industry 4.0",
    participant: {
      name: "Muhammad Hafizuddin bin Salleh",
      email: "m032310045@student.utem.edu.my",
      phone: "0176603218",
      education_level: "POSTGRADUATE",
      institution: { name: "Universiti Teknikal Malaysia Melaka", country: MY },
      government_id: { type: "NATIONAL_ID", number: "960411045671" },
    },
    project: {
      title: "Digital Twin for Predictive Maintenance of CNC Machines",
      abstract:
        "Unplanned CNC spindle failures cause costly downtime for SMEs in the Melaka industrial corridor. We developed a digital twin that streams vibration, temperature, and current data via OPC UA into a physics-informed model to estimate remaining useful life. The twin predicted bearing failures an average of 11 days in advance.",
    },
    members: [],
    supervisors: [
      { name: "Ts. Dr. Mohd Hadzley bin Abu Bakar", email: "hadzley@utem.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "SUBMITTED",
  },
  {
    category: "Creative Multimedia & Digital Content",
    participant: {
      name: "Nurul Huda binti Rahim",
      email: "nurulhuda.rahim05@gmail.com",
      phone: "0198812345",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Teknologi MARA", country: MY },
      government_id: { type: "NATIONAL_ID", number: "050619020448" },
    },
    project: {
      title: "Digital Comic E-Book on Mental Health Awareness for Teenagers",
      abstract:
        "Stigma prevents many Malaysian teenagers from seeking help for anxiety and depression. This digital comic follows three secondary-school characters as they recognise warning signs and reach out for support, with embedded links to the Talian HEAL 15555 helpline. Content was reviewed by a counsellor from UiTM's Student Affairs Division.",
    },
    members: [
      { name: "Alya Maisarah binti Johari", email: "alyamaisarah.j@gmail.com" },
    ],
    supervisors: [
      { name: "Puan Norazlina binti Mohamad", email: "norazlina@uitm.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_OTHER"],
    status: "SUBMITTED",
  },
  {
    category: "Artificial Intelligence & Machine Learning",
    participant: {
      name: "Wong Kah Mun",
      email: "kahmun.wong@siswa.um.edu.my",
      phone: "0122245698",
      education_level: "POSTGRADUATE",
      institution: { name: "Universiti Malaya", country: MY },
      government_id: { type: "NATIONAL_ID", number: "900727145086" },
    },
    project: {
      title:
        "Graph Neural Networks for Drug–Target Interaction Prediction in Tropical Disease Research",
      abstract:
        "Drug discovery for neglected tropical diseases is underfunded and slow. This thesis models proteins and compounds as graphs and uses a message-passing neural network to predict binding affinity. The approach outperforms DeepDTA on the Davis and KIBA benchmarks and shortlisted 14 repurposing candidates against the dengue NS5 protein.",
    },
    members: [],
    supervisors: [
      { name: "Assoc. Prof. Dr. Chan Chee Seng", email: "cs.chan@um.edu.my" },
    ],
    documents: ["PROJECT_REPORT"],
    status: "SUBMITTED",
  },
  {
    category: "Social Innovation",
    participant: {
      name: "Amirul Haikal bin Suhaimi",
      email: "amirul.haikal@s.unikl.edu.my",
      phone: "0183327419",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "010506061127" },
    },
    project: {
      title: "Mobile Platform Connecting Orang Asli Artisans with Online Marketplaces",
      abstract:
        "Orang Asli craftspeople in Pahang rely on middlemen who capture most of the profit from their handicrafts. This platform lets artisans list products through a voice-guided app in Bahasa Melayu and Semai, with community coordinators handling logistics. Early pilots with 18 artisans in Cameron Highlands increased their average income by 40%.",
    },
    members: [
      { name: "Nur Qistina binti Hamdan", email: "qistina.hamdan@s.unikl.edu.my" },
      { name: "Faris Iskandar bin Roslan", email: "faris.roslan@s.unikl.edu.my" },
    ],
    supervisors: [
      { name: "Dr. Suraya binti Ya'acob", email: "suraya.yaacob@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION"],
    status: "SUBMITTED",
  },
  {
    category: "Health & Biomedical Technology",
    participant: {
      name: "Dk Nur Syazwani binti Pg Hj Ahmad",
      email: "21m8134@ubd.edu.bn",
      phone: "+673 872 4419",
      education_level: "POSTGRADUATE",
      institution: { name: "Universiti Brunei Darussalam", country: "Brunei" },
      government_id: { type: "PASSPORT", number: "B01928374" },
    },
    project: {
      title: "Mobile Application for Gestational Diabetes Self-Monitoring",
      abstract:
        "Gestational diabetes affects roughly one in seven pregnancies in Brunei. This app lets expectant mothers log glucose readings via Bluetooth glucometers, receive culturally appropriate meal suggestions, and share trends with their obstetrician. A pilot at RIPAS Hospital improved logging adherence from 58% to 87%.",
    },
    members: [],
    supervisors: [
      { name: "Dr. Hajah Norhayati binti Haji Kassim", email: "norhayati.kassim@ubd.edu.bn" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_DEMO"],
    status: "SUBMITTED",
  },
  {
    category: "Internet of Things",
    participant: {
      name: "Siva Kumar a/l Rajendran",
      email: "sivakumar.r@s.unikl.edu.my",
      phone: "0165521908",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Kuala Lumpur", country: MY },
      government_id: { type: "NATIONAL_ID", number: "040823085513" },
    },
    project: {
      title:
        "Smart Parking Guidance System Using ESP32-CAM and License Plate Recognition",
      abstract:
        "Students waste significant time searching for parking at the campus during peak hours. ESP32-CAM modules mounted above parking bays detect occupancy and read licence plates, updating a live map in the campus mobile app. The system also flags vehicles parked in reserved bays without a valid sticker.",
    },
    members: [
      { name: "Muhammad Zikri bin Zainal", email: "zikri.zainal@s.unikl.edu.my" },
    ],
    supervisors: [
      { name: "Ts. Faizal bin Ahmad Fadzil", email: "faizal.fadzil@unikl.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PHOTO"],
    status: "SUBMITTED",
  },
  {
    category: "Sustainable Energy & Green Technology",
    participant: {
      name: "Izzah Nabilah binti Faisal",
      email: "izzah_22004513@utp.edu.my",
      phone: "0112876543",
      education_level: "UNDERGRADUATE",
      institution: { name: "Universiti Teknologi PETRONAS", country: MY },
      government_id: { type: "NATIONAL_ID", number: "030912080294" },
    },
    project: {
      title:
        "Piezoelectric Floor Tiles for Energy Harvesting in High-Traffic Campus Areas",
      abstract:
        "Footfall in campus walkways represents an untapped source of renewable energy. We designed modular floor tiles embedding PZT piezoelectric discs with a rectifier and supercapacitor bank to power LED wayfinding lights. A 3 m² installation outside the UTP library generated an average of 1.8 Wh per day.",
    },
    members: [
      { name: "Adam Haris bin Kamaruddin", email: "adam_22004871@utp.edu.my" },
      { name: "Low Yi Xuan", email: "yixuan_22003390@utp.edu.my" },
    ],
    supervisors: [
      { name: "Ir. Dr. Mohd Faris bin Abdullah", email: "mfaris.abdullah@utp.edu.my" },
    ],
    documents: ["PROJECT_REPORT", "PROJECT_PRESENTATION", "PROJECT_VIDEO"],
    status: "SUBMITTED",
  },
];

const DOCUMENT_FILES = {
  PROJECT_REPORT: (slug) => `${slug}-Final-Report.pdf`,
  PROJECT_PRESENTATION: (slug) => `${slug}-Slides.pdf`,
  PROJECT_DEMO: (slug) => `${slug}-Demo.mp4`,
  PROJECT_VIDEO: (slug) => `${slug}-Pitch-Video.mp4`,
  PROJECT_PHOTO: (slug) => `${slug}-Prototype.jpg`,
  PROJECT_OTHER: (slug) => `${slug}-Poster.pdf`,
};

// ---------------------------------------------------------------------------

async function seedCategories(db) {
  const col = db.collection("categories");
  const idBySlug = new Map();
  let inserted = 0;

  for (const name of CATEGORIES) {
    const category_id = slugify(name);
    const res = await col.updateOne(
      { category_id },
      { $setOnInsert: { category_id, name } },
      { upsert: true }
    );
    if (res.upsertedCount) inserted += 1;
    const doc = await col.findOne({ category_id });
    idBySlug.set(category_id, doc._id.toString());
  }

  console.log(`categories: +${inserted} (total ${await col.countDocuments()})`);
  return idBySlug;
}

async function seedJudgeCriteria(db) {
  const col = db.collection("judge_criteria");
  let inserted = 0;

  for (const [i, c] of JUDGE_CRITERIA.entries()) {
    const criteria_id = slugify(c.name);
    const ts = new Date(Date.UTC(2026, 8, 23, 9, 30 + i));
    const res = await col.updateOne(
      { criteria_id },
      { $setOnInsert: { criteria_id, ...c, created_at: ts, updated_at: ts } },
      { upsert: true }
    );
    if (res.upsertedCount) inserted += 1;
  }

  console.log(`judge_criteria: +${inserted} (total ${await col.countDocuments()})`);
}

async function seedUsers(db) {
  const col = db.collection("users");

  // Staff roles are scoped to the current competition (latest published).
  const [competition] = await db
    .collection("competitions")
    .find({ status: "PUBLISHED" })
    .sort({ start_date: -1 })
    .limit(1)
    .toArray();
  if (!competition) {
    console.log("users: skipped (no published competition to assign roles to)");
    return;
  }
  const competitionId = competition._id.toString();

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const now = Date.now();
  let inserted = 0;

  for (const [i, u] of USERS.entries()) {
    const created = new Date(Date.UTC(2026, 8, 22, 15) + i * 3 * HOUR);
    const doc = {
      email: u.email.toLowerCase(),
      roles: u.roles.map((role) =>
        role === "ADMIN" ? { role } : { role, competition_id: competitionId }
      ),
      status: u.status,
      email_verified: u.status !== "INVITED",
      created_at: created,
      updated_at: created,
    };
    if (u.name) doc.name = u.name;
    if (u.status !== "INVITED") doc.password_hash = passwordHash;
    if (u.status === "INVITED") {
      doc.invite_token_hash = randomBytes(32).toString("hex");
      doc.invite_expires_at = new Date(now + u.inviteExpiresInDays * DAY);
    }
    if (u.status === "DISABLED") {
      doc.updated_at = new Date(created.getTime() + 3 * DAY);
    }

    const res = await col.updateOne(
      { email: doc.email },
      { $setOnInsert: doc },
      { upsert: true }
    );
    if (res.upsertedCount) inserted += 1;
  }

  console.log(`users: +${inserted} (total ${await col.countDocuments()})`);
}

async function seedRegistrations(db, categoryIdBySlug) {
  const col = db.collection("registrations");

  const competition =
    (await db.collection("competitions").findOne({ status: "PUBLISHED" })) ??
    (await db.collection("competitions").findOne({}));
  if (!competition) {
    console.log("registrations: skipped (no competition exists yet)");
    return;
  }

  const year = new Date(competition.start_date ?? Date.now()).getUTCFullYear();
  const prefix = `REG-${year}-`;
  const existingNumbers = await col
    .find({ registration_number: { $regex: `^${prefix}` } })
    .project({ registration_number: 1 })
    .toArray();
  let next =
    existingNumbers.reduce(
      (max, r) => Math.max(max, Number(r.registration_number.slice(prefix.length)) || 0),
      0
    ) + 1;

  const start = Date.UTC(2026, 8, 22, 10);
  const end = Date.now() - 2 * HOUR;
  const step = (end - start) / REGISTRATIONS.length;
  let inserted = 0;

  for (const [i, r] of REGISTRATIONS.entries()) {
    const exists = await col.findOne({ "project.title": r.project.title });
    if (exists) continue;

    const categoryId = categoryIdBySlug.get(slugify(r.category));
    const jitter = ((i * 7919) % 97) / 97;
    const created = new Date(start + i * step + jitter * step * 0.6);
    const reviewDelay = r.status === "SUBMITTED" ? 0 : (1 + ((i * 31) % 40) / 10) * DAY;
    const updated = new Date(Math.min(created.getTime() + reviewDelay, end));

    const fileSlug = r.project.title
      .split(/\s+/)
      .slice(0, 4)
      .join("-")
      .replace(/[^A-Za-z0-9-]/g, "");

    await col.insertOne({
      _id: ObjectId.createFromTime(Math.floor(created.getTime() / 1000)),
      registration_number: `${prefix}${String(next).padStart(4, "0")}`,
      competition_id: competition._id.toString(),
      category_id: categoryId,
      participant: r.participant,
      project: r.project,
      team: {
        lead: { name: r.participant.name, email: r.participant.email },
        members: r.members,
      },
      supervisors: r.supervisors,
      documents: r.documents.map((type) => {
        const file_name = DOCUMENT_FILES[type](fileSlug);
        return { type, file_name, file_url: blobUrl("registrations", file_name) };
      }),
      status: r.status,
      created_at: created,
      updated_at: updated,
    });
    next += 1;
    inserted += 1;
  }

  console.log(`registrations: +${inserted} (total ${await col.countDocuments()})`);
}

const RECEIPT_FILES = [
  (n) => `MC-Receipt-${n}.jpg`,
  (n) => `Maybank2u-Transfer-${n}.pdf`,
  (n) => `CIMB-Clicks-Receipt-${n}.pdf`,
  (n) => `DuitNow-${n}.png`,
  (n) => `Bank-Transfer-Slip-${n}.jpg`,
  (n) => `Wise-Transfer-Receipt-${n}.pdf`,
];

function paymentStatusFor(registration, index) {
  if (registration.status === "SUBMITTED") {
    return index % 4 === 0 ? "FAILED" : "PENDING";
  }
  return "PAID";
}

async function seedPayments(db) {
  const regCol = db.collection("registrations");
  const payCol = db.collection("payments");

  const paidIds = new Set(
    (await payCol.find().project({ registration_id: 1 }).toArray()).map((p) =>
      p.registration_id.toString()
    )
  );
  const registrations = await regCol.find().sort({ registration_number: 1 }).toArray();
  let inserted = 0;

  for (const [i, r] of registrations.entries()) {
    const regId = r._id.toString();
    if (paidIds.has(regId)) continue;

    const international = r.participant.institution.country !== MY;
    const receipt = RECEIPT_FILES[i % RECEIPT_FILES.length](r.registration_number);
    const created = new Date(new Date(r.created_at).getTime() + 400 + (i % 5) * 1000);

    await payCol.insertOne({
      registration_id: regId,
      amount: international ? 250 : 150,
      status: paymentStatusFor(r, i),
      receipt_url: blobUrl("payments/receipts", receipt),
      created_at: created,
      updated_at: r.updated_at ?? created,
    });
    inserted += 1;
  }

  console.log(`payments: +${inserted} (total ${await payCol.countDocuments()})`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(dbName);
    console.log(`Seeding database "${dbName}"...`);
    const categoryIdBySlug = await seedCategories(db);
    await seedJudgeCriteria(db);
    await seedUsers(db);
    await seedRegistrations(db, categoryIdBySlug);
    await seedPayments(db);
    console.log(`Done. Active seeded portal users can log in with password: ${DEV_PASSWORD}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
