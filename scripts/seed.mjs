// Wipes and reseeds icpex_staging so every collection matches the current schemas.
// Usage: npm run seed   (reads MONGODB_URI / DB_NAME from .env)
//        npm run seed -- criteria   (replace judge rubrics only; does not wipe)
// Refuses to run a full reseed against any database other than icpex_staging.

import { createHash, randomBytes, scrypt } from "crypto";
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

function categoryRegistrationCode(name) {
  const words = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9.]+/)
    .map((word) => word.replace(/^\.+|\.+$/g, ""))
    .filter((word) => /[A-Za-z]/.test(word));
  if (words.length === 0) return "REG";
  if (words.length === 1) {
    const letters = words[0].replace(/[^A-Za-z]/g, "");
    return letters.slice(0, 3).toUpperCase() || "REG";
  }
  return words.map((word) => word[0]).join("").toUpperCase();
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

/** Same key the app uses to count a university's projects. */
function normalizeInstitution(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evenWeights(count) {
  const tenths = Math.floor(1000 / count);
  const remainder = 1000 - tenths * count;
  return Array.from(
    { length: count },
    (_, index) => (tenths + (index < remainder ? 1 : 0)) / 10
  );
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function weightedRubricScore(parts) {
  return roundScore(
    parts.reduce((sum, part) => sum + (part.score * part.weight) / 100, 0)
  );
}

function averageRubricScores(scores) {
  if (scores.length === 0) return 0;
  return roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
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
// Sample rubrics. Thesis and JTEC are rubric names, not assignment types.
// Component weights inside a rubric add up to 100%. Score bands run from 1 to 10.
// ---------------------------------------------------------------------------

const JUDGE_CRITERIA = [
  {
    name: "Originality",
    component:
      "Novelty of the research problem, approach, or findings compared with existing work in the field.",
    bands: {
      "0-2":
        "The work repeats known ideas with no identifiable contribution.",
      "3-4":
        "A familiar problem or method, with only a minor variation on existing work.",
      "5-6":
        "A clear point of difference, though much of the approach follows established work.",
      "7-8":
        "A distinct problem, method, or finding that is well distinguished from prior work.",
      "9-10":
        "A substantial original contribution that opens a new line of inquiry or application.",
    },
    type: "THESIS",
  },
  {
    name: "Research Methodology",
    component:
      "Soundness of the research design, data collection, and analysis, and whether they fit the stated objectives.",
    bands: {
      "0-2":
        "Objectives, method, and analysis are missing or do not connect.",
      "3-4":
        "A method is named, but the design, data, or analysis has major gaps.",
      "5-6":
        "A workable design that addresses the objectives, with some weaknesses in data or analysis.",
      "7-8":
        "A coherent design, appropriate data, and analysis that support the claims.",
      "9-10":
        "A rigorous, well justified method whose evidence fully supports the conclusions.",
    },
    type: "THESIS",
  },
  {
    name: "Technical Implementation",
    component:
      "Quality and completeness of the prototype, experiments, or technical solution.",
    bands: {
      "0-2":
        "No working solution, or the implementation does not address the problem.",
      "3-4":
        "An incomplete prototype or experiment, with important parts missing or untested.",
      "5-6":
        "A working implementation that meets the core requirements, with some unfinished parts.",
      "7-8":
        "A complete, reliable solution with clear evidence that it performs as intended.",
      "9-10":
        "A polished implementation, thoroughly tested, and ready to be reproduced or extended.",
    },
    type: "THESIS",
  },
  {
    name: "Impact & Significance",
    component:
      "Potential contribution to industry, society, or knowledge, including commercialisation potential.",
    bands: {
      "0-2":
        "No stated beneficiary, and no plausible effect beyond the project itself.",
      "3-4":
        "A general claim of usefulness without evidence of who benefits or how.",
      "5-6":
        "A defined audience or use, with a reasonable but partly evidenced benefit.",
      "7-8":
        "A convincing benefit to a specific group, industry, or body of knowledge.",
      "9-10":
        "A significant, well evidenced contribution with a credible path to adoption or publication.",
    },
    type: "THESIS",
  },
  {
    name: "Presentation & Documentation",
    component:
      "Clarity of the written report, figures, and citations, and adherence to academic writing standards.",
    bands: {
      "0-2":
        "The report is unclear, incomplete, or missing citations and structure.",
      "3-4":
        "The main idea can be followed, but organisation, figures, or references are weak.",
      "5-6":
        "A readable report with adequate figures and citations, and some lapses in writing.",
      "7-8":
        "A clear, well structured report with accurate figures and consistent citations.",
      "9-10":
        "Publication-quality writing, figures, and referencing that make the work easy to assess.",
    },
    type: "THESIS",
  },
  {
    name: "Authenticity",
    component:
      "Original authorship of the e-book, with proper attribution and no uncredited copied material.",
    bands: {
      "0-2":
        "Large parts appear copied, or sources and authorship are not acknowledged.",
      "3-4":
        "Some original writing, but noticeable copied or poorly attributed passages.",
      "5-6":
        "Mostly original, with sources credited and only minor attribution gaps.",
      "7-8":
        "Clearly the authors' own work, with consistent and accurate attribution.",
      "9-10":
        "Fully original, transparently sourced, and free of uncredited material.",
    },
    type: "JTEC",
  },
  {
    name: "Content Accuracy",
    component:
      "Factual correctness and depth of the subject matter, at a level suited to the intended audience.",
    bands: {
      "0-2":
        "Serious factual errors, or content too thin for the stated audience.",
      "3-4":
        "The topic is covered, but important facts are wrong, outdated, or oversimplified.",
      "5-6":
        "Generally accurate content at the right level, with a few gaps or minor errors.",
      "7-8":
        "Accurate, sufficiently deep content that matches the audience and learning goals.",
      "9-10":
        "Authoritative, current, and well scoped content with no meaningful inaccuracies.",
    },
    type: "JTEC",
  },
  {
    name: "Visual Design & Layout",
    component:
      "Consistency of typography, colour, illustrations, and page layout across the e-book.",
    bands: {
      "0-2":
        "Layout is inconsistent or hard to read, and visual elements clash or are missing.",
      "3-4":
        "A basic layout, with uneven type, spacing, colour, or illustration quality.",
      "5-6":
        "A consistent layout that is readable, with some uneven pages or visuals.",
      "7-8":
        "A coherent visual system: clear hierarchy, consistent type, and supportive illustrations.",
      "9-10":
        "A polished, consistent design that makes the content easy to navigate and understand.",
    },
    type: "JTEC",
  },
  {
    name: "Readability & Language",
    component:
      "Clear structure, correct grammar, and a reading level suited to the target readers.",
    bands: {
      "0-2":
        "Frequent errors or wording that the intended readers would struggle to follow.",
      "3-4":
        "Understandable in parts, but grammar, tone, or structure often get in the way.",
      "5-6":
        "Clear enough for the audience, with some awkward sentences or structural gaps.",
      "7-8":
        "Fluent, well structured language at the right reading level, with few errors.",
      "9-10":
        "Precise, engaging writing that is consistently appropriate for the target readers.",
    },
    type: "JTEC",
  },
  {
    name: "Interactivity & Multimedia",
    component:
      "Use of audio, video, quizzes, or links in ways that help the reader learn.",
    bands: {
      "0-2":
        "No meaningful media or interaction, or media that does not relate to the content.",
      "3-4":
        "Media or activities are present but decorative, broken, or weakly tied to the text.",
      "5-6":
        "Relevant media or activities that support some of the learning points.",
      "7-8":
        "Well chosen media and interaction that reinforce the content and work reliably.",
      "9-10":
        "Integrated multimedia and activities that clearly deepen understanding throughout.",
    },
    type: "JTEC",
  },
  {
    name: "Innovation & Creativity",
    component:
      "How new and inventive the technology or engineering solution is, and how creatively it tackles the problem.",
    bands: {
      "0-2":
        "A routine application of an existing product, with no inventive step.",
      "3-4":
        "A small twist on a known solution, with limited creative problem solving.",
      "5-6":
        "A recognisable new combination or adaptation that addresses the problem.",
      "7-8":
        "A creative solution with a clear inventive idea and a convincing use of it.",
      "9-10":
        "A highly original solution that changes how the problem can be approached.",
    },
    type: "JTEC",
  },
  {
    name: "Technical Feasibility",
    component:
      "Soundness of the engineering design, choice of technology, and evidence that the solution works.",
    bands: {
      "0-2":
        "The design is not credible, or there is no evidence the solution can work.",
      "3-4":
        "A plausible idea, but the design, technology choice, or evidence is weak.",
      "5-6":
        "A sound basic design with partial evidence that the chosen technology works.",
      "7-8":
        "A justified design and technology choice, supported by a working demonstration.",
      "9-10":
        "A robust, well evidenced design that is clearly feasible to build and operate.",
    },
    type: "JTEC",
  },
  {
    name: "Practical Application",
    component:
      "How well the solution meets a real need, including usability, scale, and readiness to deploy.",
    bands: {
      "0-2":
        "No clear user or setting, or the solution cannot be used as proposed.",
      "3-4":
        "A real need is named, but usability, scale, or deployment is largely unaddressed.",
      "5-6":
        "Usable for the stated need, with some open questions about scale or deployment.",
      "7-8":
        "Practical for the intended users, with a credible plan for scale and deployment.",
      "9-10":
        "Ready for real use: usable, appropriately scaled, and prepared for deployment.",
    },
    type: "JTEC",
  },
  {
    name: "Commercial & Social Value",
    component:
      "Market potential, cost-effectiveness, and benefit to industry or the community, including sustainability.",
    bands: {
      "0-2":
        "No identifiable customer, community benefit, or reason the solution is worth its cost.",
      "3-4":
        "A benefit is claimed, but cost, market, or community value is weakly supported.",
      "5-6":
        "A plausible market or social benefit, with a partial view of cost or sustainability.",
      "7-8":
        "A clear beneficiary, a reasonable cost case, and a stated sustainability consideration.",
      "9-10":
        "A compelling commercial or social case, cost-effective and sustainable for the context.",
    },
    type: "JTEC",
  },
  {
    name: "Demonstration & Communication",
    component:
      "Clarity of the prototype demonstration, video, and documents in explaining how the solution works.",
    bands: {
      "0-2":
        "The demonstration or documents do not show what the solution does.",
      "3-4":
        "A viewer can see the idea, but how it works remains unclear or incomplete.",
      "5-6":
        "The demo and documents explain the main functions, with some missing detail.",
      "7-8":
        "A clear demo and supporting material that show how the solution works.",
      "9-10":
        "A concise, complete explanation that lets a judge assess the solution without guesswork.",
    },
    type: "JTEC",
  },
];

// ---------------------------------------------------------------------------
// Portal users (judges & secretariat)
// ---------------------------------------------------------------------------

const MY = "Malaysia";

const USERS = [
  {
    name: "Dato' Ir. Dr. Khairul Anuar bin Abdullah",
    email: "khairul.anuar@unikl.edu.my",
    roles: ["SUPER_ADMIN"],
    status: "ACTIVE",
  },
  {
    name: "Dr. Norazlina binti Hassan",
    email: "norazlina.hassan@unikl.edu.my",
    roles: ["POSTGRAD_ADMIN"],
    status: "ACTIVE",
  },
  {
    name: "Ts. Dr. Hafizuddin bin Rahman",
    email: "hafizuddin.rahman@unikl.edu.my",
    roles: ["UNDERGRAD_ADMIN"],
    status: "ACTIVE",
  },
  {
    name: "Nurul Izzati binti Kamarudin",
    email: "nurulizzati.kamarudin@unikl.edu.my",
    roles: ["POSTGRAD_SECRETARIAT"],
    status: "ACTIVE",
  },
  {
    name: "Farah Hanim binti Zulkifli",
    email: "farahhanim.zulkifli@unikl.edu.my",
    roles: ["UNDERGRAD_SECRETARIAT"],
    status: "ACTIVE",
  },
  {
    name: "Prof. Madya Dr. Siti Aishah binti Rahman",
    email: "sitiaishah.rahman@unikl.edu.my",
    roles: ["POSTGRAD_JUDGE_LEADER"],
    status: "ACTIVE",
  },
  {
    name: "Ts. Dr. Azman bin Yusof",
    email: "azman.yusof@unikl.edu.my",
    roles: ["UNDERGRAD_JUDGE_LEADER"],
    status: "ACTIVE",
  },
  {
    name: "Ts. Dr. Azlan bin Hashim",
    email: "azlan.hashim@unikl.edu.my",
    roles: ["POSTGRAD_JUDGE"],
    status: "ACTIVE",
    institution: { name: "IIUM", country: MY },
    national_id: "750418105521",
  },
  {
    name: "Dr. Lim Wei Chen",
    email: "lim.weichen@utm.my",
    roles: ["POSTGRAD_JUDGE"],
    status: "ACTIVE",
    institution: { name: "UUM", country: MY },
    national_id: "800922085433",
  },
  {
    name: "Dr. Priya a/p Ramasamy",
    email: "priya.ramasamy@um.edu.my",
    roles: ["UNDERGRAD_JUDGE"],
    status: "ACTIVE",
    institution: { name: "UniMAP", country: MY },
    national_id: "820614025886",
  },
  {
    name: "Encik Mohd Hafiz bin Othman",
    email: "mhafiz.othman@unikl.edu.my",
    roles: ["UNDERGRAD_JUDGE"],
    status: "ACTIVE",
    institution: { name: "UniSZA", country: MY },
    national_id: "790305015667",
  },
  {
    email: "rajeshkumar.s@usm.my",
    roles: ["POSTGRAD_JUDGE"],
    status: "INVITED",
    inviteExpiresInDays: 5,
  },
  {
    email: "tan.meiling@upm.edu.my",
    roles: ["UNDERGRAD_JUDGE"],
    status: "INVITED",
    inviteExpiresInDays: -2,
  },
  {
    name: "Mohd Faizal bin Ismail",
    email: "mfaizal.ismail@unikl.edu.my",
    roles: ["UNDERGRAD_SECRETARIAT"],
    status: "DISABLED",
  },
];

// Official names from the registration form. The 6th UniKL MIIT project is free.
const INSTITUTION_NAMES = {
  "Universiti Kuala Lumpur": "UniKL MIIT",
  "Universiti Teknologi Malaysia": "UTM",
  "Universiti Teknologi MARA": "UiTM",
  "Universiti Sains Malaysia": "USM",
  "Universiti Kebangsaan Malaysia": "UKM",
  "Universiti Pendidikan Sultan Idris": "UPSI",
  "Politeknik Ungku Omar": "UTHM",
  "Universiti Putra Malaysia": "UPM",
  "Multimedia University": "MMU",
  "Taylor's University": "UCSI",
  "Universiti Teknikal Malaysia Melaka": "UTeM",
  "Universiti Malaya": "UM",
  "Universiti Teknologi PETRONAS": "UTP",
};

const UNIKL_FEE = 100;
const MALAYSIA_FEE = 150;
const INTERNATIONAL_FEE = 50;

/**
 * One stage per registration, in REGISTRATIONS order.
 * Payment is requested after secretary review; judging starts once a project is accepted.
 */
const FLOWS = [
  "completed",
  "accepted",
  "rejected",
  "completed",
  "accepted",
  "reviewing",
  "accepted",
  "rejected",
  "reviewing",
  "underpaid",
  "reviewing",
  "accepted",
  "reviewing",
  "reviewing",
  "rejected",
  "pending_receipt",
  "awaiting",
  "review",
  "reminded",
  "reviewing",
  "reviewing",
  "failed",
  "accepted",
  "pending_receipt",
];

const VIDEO_LINKS = [
  "https://youtu.be/aqz-KE-bpKQ",
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
  "https://www.youtube.com/watch?v=M7lc1UVf-VE",
];

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

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

const RECEIPT_FILES = [
  (n) => `MC-Receipt-${n}.jpg`,
  (n) => `Maybank2u-Transfer-${n}.pdf`,
  (n) => `CIMB-Clicks-Receipt-${n}.pdf`,
  (n) => `DuitNow-${n}.png`,
  (n) => `Bank-Transfer-Slip-${n}.jpg`,
  (n) => `Wise-Transfer-Receipt-${n}.pdf`,
];

const ROLES = new Set([
  "SUPER_ADMIN",
  "POSTGRAD_ADMIN",
  "UNDERGRAD_ADMIN",
  "POSTGRAD_SECRETARIAT",
  "UNDERGRAD_SECRETARIAT",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
]);

function rubricBands(bands) {
  return {
    "1-2": bands["1-2"] ?? bands["0-2"],
    "3-4": bands["3-4"],
    "5-6": bands["5-6"],
    "7-8": bands["7-8"],
    "9-10": bands["9-10"],
  };
}

function feeForInstitution(institution) {
  if (institution.country !== MY) {
    return { amount: INTERNATIONAL_FEE, currency: "USD" };
  }
  return institution.name.startsWith("UniKL")
    ? { amount: UNIKL_FEE, currency: "MYR" }
    : { amount: MALAYSIA_FEE, currency: "MYR" };
}

async function resetDatabase(db) {
  const existing = await db.listCollections().toArray();
  for (const { name } of existing) {
    if (name.startsWith("system.")) continue;
    await db.collection(name).drop();
  }
  console.log(`Dropped ${existing.length} collection(s).`);
}

async function seedCategories(db) {
  const col = db.collection("categories");
  const idBySlug = new Map();
  const now = new Date();

  for (const name of CATEGORIES) {
    const _id = new ObjectId();
    const category_id = slugify(name);
    await col.insertOne({ _id, category_id, name, created_at: now, updated_at: now });
    idBySlug.set(category_id, _id.toHexString());
  }

  console.log(`categories: ${await col.countDocuments()}`);
  return idBySlug;
}

async function seedCompetitions(db) {
  const col = db.collection("competitions");
  const now = new Date();
  const rows = [
    {
      _id: new ObjectId(),
      competition_id: "icpex-2025",
      name: "ICPEX 2025",
      start_date: new Date("2025-09-01T00:00:00.000Z"),
      end_date: new Date("2025-11-30T00:00:00.000Z"),
      judging_due_date: new Date("2025-12-15T00:00:00.000Z"),
      status: "COMPLETED",
      eligibility: "BOTH",
    },
    {
      _id: new ObjectId(),
      competition_id: "icpex-2026",
      name: "ICPEX 2026",
      start_date: new Date("2026-09-01T00:00:00.000Z"),
      end_date: new Date("2026-12-15T00:00:00.000Z"),
      judging_due_date: new Date("2026-12-31T00:00:00.000Z"),
      status: "PUBLISHED",
      eligibility: "BOTH",
    },
    {
      _id: new ObjectId(),
      competition_id: "icpex-2027",
      name: "ICPEX 2027",
      start_date: new Date("2027-09-01T00:00:00.000Z"),
      end_date: new Date("2027-11-30T00:00:00.000Z"),
      judging_due_date: new Date("2027-12-15T00:00:00.000Z"),
      status: "DRAFT",
      eligibility: "BOTH",
    },
  ];

  await col.insertMany(rows.map((row) => ({ ...row, created_at: now, updated_at: now })));
  const current = rows.find((row) => row.status === "PUBLISHED");
  console.log(`competitions: ${rows.length} (current ${current.competition_id})`);
  return current._id.toHexString();
}

async function seedBanner(db, competitionId) {
  const now = new Date();
  await db.collection("banners").insertOne({
    _id: new ObjectId(),
    competition_id: competitionId,
    eyebrow: "ICPEX 2026",
    headline: "Innovation, Commercialisation and Entrepreneurship Exhibition",
    subheadline:
      "Undergraduate and postgraduate projects from Malaysia and abroad.",
    image_url: "",
    created_at: now,
    updated_at: now,
  });
  console.log("banners: 1");
}

function rubricGroups() {
  return [
    {
      name: "Thesis",
      items: JUDGE_CRITERIA.filter((item) => item.type === "THESIS"),
    },
    {
      name: "JTEC",
      items: JUDGE_CRITERIA.filter((item) => item.type === "JTEC"),
    },
  ];
}

async function seedJudgeRubrics(db, competitionId) {
  const col = db.collection("judge_rubrics");
  await col.deleteMany({ competition_id: competitionId });
  const now = new Date();
  const byLevel = new Map();

  for (const education_level of ["UNDERGRADUATE", "POSTGRADUATE"]) {
    const components = [];
    for (const [sort_order, group] of rubricGroups().entries()) {
      const weights = evenWeights(group.items.length);
      const rubricComponents = group.items.map((item, index) => ({
        _id: new ObjectId().toHexString(),
        name: item.name,
        description: item.component,
        weight: weights[index],
        sort_order: index,
        bands: rubricBands(item.bands),
      }));
      await col.insertOne({
        _id: new ObjectId(),
        competition_id: competitionId,
        education_level,
        name: group.name,
        sort_order,
        components: rubricComponents,
        created_at: now,
        updated_at: now,
      });
      for (const component of rubricComponents) {
        components.push({ ...component, rubric: group.name });
      }
    }
    byLevel.set(education_level, components);
  }

  console.log(`judge_rubrics: ${await col.countDocuments()}`);
  return byLevel;
}

async function seedUsers(db, competitionId, categoryIds) {
  const col = db.collection("users");
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const now = Date.now();
  const invites = [];
  const judges = { POSTGRADUATE: [], UNDERGRADUATE: [] };

  for (const [i, user] of USERS.entries()) {
    for (const role of user.roles) {
      if (!ROLES.has(role)) throw new Error(`Unknown role ${role}`);
    }
    const created = new Date(Date.UTC(2026, 8, 1, 2) + i * 3 * HOUR);
    const doc = {
      _id: new ObjectId(),
      email: user.email.toLowerCase(),
      roles: user.roles.map((role) =>
        role === "SUPER_ADMIN" ? { role } : { role, competition_id: competitionId }
      ),
      status: user.status,
      email_verified: user.status !== "INVITED",
      created_at: created,
      updated_at: created,
    };
    if (user.name) doc.name = user.name;
    if (user.status !== "INVITED") doc.password_hash = passwordHash;
    if (user.status === "INVITED") {
      const token = randomBytes(32).toString("base64url");
      doc.invite_token_hash = sha256(token);
      doc.invite_expires_at = new Date(now + user.inviteExpiresInDays * DAY);
      invites.push({ email: doc.email, token, expired: user.inviteExpiresInDays < 0 });
    }
    if (user.status === "DISABLED") {
      doc.updated_at = new Date(created.getTime() + 3 * DAY);
    }
    if (user.institution) {
      const level = user.roles.includes("POSTGRAD_JUDGE")
        ? "POSTGRADUATE"
        : "UNDERGRADUATE";
      doc.judge_profile = {
        institution: user.institution,
        institution_key: normalizeInstitution(user.institution.name),
        national_id: user.national_id,
        category_ids: categoryIds,
        education_eligibility: level,
      };
      if (user.status === "ACTIVE") judges[level].push(doc);
    }

    await col.insertOne(doc);
  }

  console.log(`users: ${await col.countDocuments()}`);
  return { judges, invites };
}

function projectDocuments(title, index, educationLevel) {
  const fileSlug = title
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .replace(/[^A-Za-z0-9-]/g, "");
  const documents = [
    {
      type: "ABSTRACT",
      file_name: `${fileSlug}-Abstract.pdf`,
      file_url: blobUrl("registrations", `${fileSlug}-Abstract.pdf`),
    },
  ];
  if (educationLevel === "POSTGRADUATE" || index % 3 === 0) {
    documents.push({
      type: "FULL_PAPER",
      file_name: `${fileSlug}-Full-Paper.pdf`,
      file_url: blobUrl("registrations", `${fileSlug}-Full-Paper.pdf`),
    });
  }
  documents.push({
    type: "VIDEO_LINK",
    file_name: "Video link",
    file_url: VIDEO_LINKS[index % VIDEO_LINKS.length],
  });
  return documents;
}

function settlement(flow, { fee, currency, created, updated, submissionNumber, index }) {
  const paid =
    fee === 0 ||
    flow === "reviewing" ||
    flow === "accepted" ||
    flow === "completed" ||
    flow === "rejected" ||
    flow === "overpaid";
  const receipt =
    fee > 0 &&
    (paid || flow === "pending_receipt" || flow === "failed" || flow === "underpaid");
  const receiptUrl = receipt
    ? blobUrl(
        "payments/receipts",
        RECEIPT_FILES[index % RECEIPT_FILES.length](submissionNumber)
      )
    : undefined;
  const token = randomBytes(32).toString("base64url");
  const requested = new Date(created.getTime() + 2 * DAY);
  const link =
    flow === "review" && fee > 0
      ? {}
      : {
          payment_token: token,
          payment_token_hash: sha256(token),
          payment_requested_at: requested,
        };

  let paymentStatus = "REVIEW";
  let registrationStatus = "SUBMITTED";
  const submission = { ...link };

  if (flow === "awaiting") paymentStatus = "AWAITING";
  if (flow === "reminded") {
    paymentStatus = "AWAITING";
    submission.payment_reminded_at = updated;
  }
  if (flow === "pending_receipt") paymentStatus = "PENDING";
  if (flow === "failed") paymentStatus = "FAILED";
  if (flow === "underpaid") {
    const balance = Math.max(20, Math.round(fee * 0.3));
    paymentStatus = "AWAITING";
    submission.balance_due = balance;
    submission.balance_currency = currency;
    submission.payment_adjustments = [
      {
        type: "UNDERPAID",
        amount: balance,
        currency,
        receipt_url: receiptUrl,
        created_at: updated,
      },
    ];
  }
  if (paid) {
    paymentStatus = "PAID";
    submission.balance_due = null;
    submission.paid_at = updated;
    submission.invoice_number = `INV-${submissionNumber.replace(/^SUB-/, "")}`;
    if (flow === "overpaid") {
      registrationStatus = "ACCEPTED";
      submission.payment_adjustments = [
        {
          type: "OVERPAID",
          amount: 20,
          currency,
          receipt_url: receiptUrl,
          created_at: updated,
        },
      ];
    } else if (flow === "reviewing" || fee === 0 && flow === "review") {
      registrationStatus = "REVIEWING";
    } else if (flow === "rejected") {
      registrationStatus = "REJECTED";
    } else if (flow === "completed") {
      registrationStatus = "COMPLETED";
    } else if (flow === "accepted" || flow === "overpaid") {
      registrationStatus = "ACCEPTED";
    } else {
      registrationStatus = "REVIEWING";
    }
  }

  return { paymentStatus, registrationStatus, receiptUrl, submission };
}

function buildScores(components, seed) {
  const scores = components.map((component, index) => ({
    component_id: component._id,
    score: 6 + ((seed + index * 3) % 5),
    weight: component.weight,
    comments: "",
  }));
  const byRubric = new Map();
  for (const component of components) {
    const score = scores.find((item) => item.component_id === component._id);
    const parts = byRubric.get(component.rubric) ?? [];
    parts.push({ score: score.score, weight: component.weight });
    byRubric.set(component.rubric, parts);
  }
  return {
    scores,
    total_score: averageRubricScores(
      [...byRubric.values()].map((parts) => weightedRubricScore(parts))
    ),
  };
}

async function seedProjects(db, categoryIdBySlug, competitionId, users, rubricsByLevel) {
  if (FLOWS.length !== REGISTRATIONS.length) {
    throw new Error(
      `FLOWS has ${FLOWS.length} entries but there are ${REGISTRATIONS.length} registrations.`
    );
  }

  const submissions = [];
  const registrations = [];
  const payments = [];
  const assignments = [];
  const priorCount = new Map();
  const start = Date.UTC(2026, 8, 8, 2);
  const end = Date.UTC(2026, 10, 3, 8);
  const step = (end - start) / REGISTRATIONS.length;
  let assignmentSeed = 1;

  REGISTRATIONS.forEach((source, index) => {
    const institutionName =
      INSTITUTION_NAMES[source.participant.institution.name] ??
      source.participant.institution.name;
    const institution = {
      name: institutionName,
      country: source.participant.institution.country,
    };
    const institutionKey = normalizeInstitution(institutionName);
    const seen = priorCount.get(institutionKey) ?? 0;
    const price = feeForInstitution(institution);
    const fee = (seen + 1) % 6 === 0 ? 0 : price.amount;
    priorCount.set(institutionKey, seen + 1);

    const created = new Date(start + index * step);
    const updated = new Date(
      Math.min(created.getTime() + (1 + (index % 5)) * DAY, end)
    );
    const submissionId = new ObjectId();
    const registrationId = new ObjectId();
    const year = 2026;
    const submissionNumber = `SUB-${year}-${String(index + 1).padStart(4, "0")}`;
    const registrationNumber = `${categoryRegistrationCode(source.category)}-${year}-${String(index + 1).padStart(4, "0")}`;
    const categoryId = categoryIdBySlug.get(slugify(source.category));
    if (!categoryId) throw new Error(`Unknown category ${source.category}`);

    const flow = fee === 0 && ["review", "awaiting", "reminded", "pending_receipt", "failed", "underpaid"].includes(FLOWS[index])
      ? "accepted"
      : FLOWS[index];
    const settled = settlement(flow, {
      fee,
      currency: price.currency,
      created,
      updated,
      submissionNumber,
      index,
    });

    submissions.push({
      _id: submissionId,
      submission_number: submissionNumber,
      competition_id: competitionId,
      institution,
      institution_key: institutionKey,
      registration_ids: [registrationId.toHexString()],
      project_count: 1,
      free_count: fee === 0 ? 1 : 0,
      amount: fee,
      currency: price.currency,
      ...settled.submission,
      created_at: created,
      updated_at: updated,
    });

    registrations.push({
      _id: registrationId,
      registration_number: registrationNumber,
      submission_id: submissionId.toHexString(),
      institution_key: institutionKey,
      fee,
      competition_id: competitionId,
      category_id: categoryId,
      participant: { ...source.participant, institution },
      project: source.project,
      team: {
        lead: { name: source.participant.name, email: source.participant.email },
        members: source.members,
      },
      supervisors: source.supervisors,
      documents: projectDocuments(
        source.project.title,
        index,
        source.participant.education_level
      ),
      status: settled.registrationStatus,
      created_at: created,
      updated_at: updated,
    });

    const payment = {
      _id: new ObjectId(),
      registration_id: registrationId.toHexString(),
      submission_id: submissionId.toHexString(),
      amount: fee,
      currency: price.currency,
      status: settled.paymentStatus,
      created_at: new Date(created.getTime() + 1000),
      updated_at: updated,
    };
    if (settled.receiptUrl) payment.receipt_url = settled.receiptUrl;
    payments.push(payment);

    const level = source.participant.education_level;
    const judges = users.judges[level] ?? [];
    const scored =
      settled.registrationStatus === "ACCEPTED" ||
      settled.registrationStatus === "COMPLETED";
    if (scored && judges.length >= 2) {
      judges.forEach((judge, judgeIndex) => {
        const submitted =
          settled.registrationStatus === "COMPLETED" || judgeIndex === 0;
        const scoredFields = submitted
          ? buildScores(rubricsByLevel.get(level), assignmentSeed++)
          : { scores: [], total_score: 0 };
        const row = {
          _id: new ObjectId(),
          judge_id: judge._id.toHexString(),
          registration_number: registrationNumber,
          status: "ACCEPTED",
          scores: scoredFields.scores,
          comments: submitted
            ? "Clear problem statement and a credible result. A wider trial would strengthen the claims."
            : "",
          total_score: scoredFields.total_score,
          created_at: updated,
          updated_at: updated,
        };
        if (submitted) row.submitted_at = updated;
        assignments.push(row);
      });
    }
  });

  const reviewing = registrations.filter((row) => row.status === "REVIEWING");
  const pendingTarget = reviewing.find(
    (row) => row.participant.education_level === "UNDERGRADUATE"
  );
  const rejectedTarget = reviewing.find(
    (row) => row.participant.education_level === "POSTGRADUATE"
  );
  if (pendingTarget && users.judges.UNDERGRADUATE[0]) {
    assignments.push({
      _id: new ObjectId(),
      judge_id: users.judges.UNDERGRADUATE[0]._id.toHexString(),
      registration_number: pendingTarget.registration_number,
      status: "PENDING",
      scores: [],
      comments: "",
      total_score: 0,
      created_at: pendingTarget.updated_at,
      updated_at: pendingTarget.updated_at,
    });
  }
  if (rejectedTarget && users.judges.POSTGRADUATE[0]) {
    assignments.push({
      _id: new ObjectId(),
      judge_id: users.judges.POSTGRADUATE[0]._id.toHexString(),
      registration_number: rejectedTarget.registration_number,
      status: "REJECTED",
      scores: [],
      comments: "",
      total_score: 0,
      created_at: rejectedTarget.updated_at,
      updated_at: rejectedTarget.updated_at,
    });
  }

  await db.collection("submissions").insertMany(submissions);
  await db.collection("registrations").insertMany(registrations);
  await db.collection("payments").insertMany(payments);
  if (assignments.length) {
    await db.collection("judge_assignments").insertMany(assignments);
  }

  console.log(
    `submissions: ${submissions.length}, registrations: ${registrations.length}, payments: ${payments.length}, judge_assignments: ${assignments.length}`
  );
}

async function ensureIndexes(db) {
  await db.collection("categories").createIndex({ category_id: 1 }, { unique: true });
  await db.collection("competitions").createIndex({ competition_id: 1 }, { unique: true });
  await db.collection("competitions").createIndex({ status: 1, start_date: -1 });
  await db.collection("banners").createIndex({ competition_id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ invite_token_hash: 1 }, { sparse: true });
  await db.collection("judge_rubrics").createIndex({
    competition_id: 1,
    education_level: 1,
    sort_order: 1,
  });
  await db.collection("registrations").createIndex(
    { registration_number: 1 },
    { unique: true }
  );
  await db.collection("registrations").createIndex({
    competition_id: 1,
    institution_key: 1,
  });
  await db.collection("submissions").createIndex(
    { submission_number: 1 },
    { unique: true }
  );
  await db.collection("submissions").createIndex(
    { payment_token_hash: 1 },
    { unique: true, sparse: true }
  );
  await db.collection("payments").createIndex({ registration_id: 1 }, { unique: true });
  await db.collection("payments").createIndex({ submission_id: 1 });
  await db.collection("judge_assignments").createIndex(
    { judge_id: 1, registration_number: 1 },
    { unique: true }
  );
}

function assertSeed(categoryCount) {
  if (categoryCount !== CATEGORIES.length) {
    throw new Error("Category count does not match the seed list.");
  }
  for (const level of ["UNDERGRADUATE", "POSTGRADUATE"]) {
    for (const group of rubricGroups()) {
      const weights = evenWeights(group.items.length);
      const tenths = weights.reduce((sum, weight) => sum + Math.round(weight * 10), 0);
      if (tenths !== 1000) {
        throw new Error(`${group.name} weights for ${level} do not add up to 100.`);
      }
    }
  }
}

async function main() {
  const only = process.argv[2];
  if (only && only !== "criteria") {
    throw new Error(`Unknown seed step "${only}". Use "criteria" or no argument.`);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = process.env.MONGODB_DATABASE ?? process.env.DB_NAME ?? "test";
  if (dbName !== "icpex_staging") {
    throw new Error(
      `Refusing to reseed "${dbName}". This script only wipes icpex_staging.`
    );
  }

  const client = await new MongoClient(uri).connect();
  try {
    const db = client.db(dbName);
    console.log(`Reseeding database "${dbName}"...`);

    if (only === "criteria") {
      const [competition] = await db
        .collection("competitions")
        .find({ status: "PUBLISHED" })
        .sort({ start_date: -1 })
        .limit(1)
        .toArray();
      if (!competition) throw new Error("No published competition to attach rubrics to.");
      await seedJudgeRubrics(db, competition._id.toHexString());
      console.log("Done.");
      return;
    }

    await resetDatabase(db);
    const categoryIdBySlug = await seedCategories(db);
    const competitionId = await seedCompetitions(db);
    await seedBanner(db, competitionId);
    const rubricsByLevel = await seedJudgeRubrics(db, competitionId);
    const users = await seedUsers(db, competitionId, [...categoryIdBySlug.values()]);
    await seedProjects(db, categoryIdBySlug, competitionId, users, rubricsByLevel);
    await ensureIndexes(db);
    assertSeed(categoryIdBySlug.size);

    console.log(`Done. Active portal users can log in with password: ${DEV_PASSWORD}`);
    if (users.invites.length) {
      console.log("Invite links:");
      for (const invite of users.invites) {
        const note = invite.expired ? " (expired)" : "";
        console.log(`  ${invite.email}${note}: /invite/${invite.token}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
