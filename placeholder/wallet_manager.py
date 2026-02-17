import asyncio
import hashlib
import hmac
import secrets
import json
from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, getcontext
from enum import Enum
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import uuid

getcontext().prec = 28

class WalletType(Enum):
    HOT = "hot"
    COLD = "cold"
    MULTISIG = "multisig"

class TransactionStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class TransactionType(Enum):
    SEND = "send"
    RECEIVE = "receive"
    SWAP = "swap"
    STAKE = "stake"
    UNSTAKE = "unstake"
    CLAIM = "claim"

@dataclass
class WalletAddress:
    address: str
    derivation_path: str
    public_key: str
    balance: Decimal = Decimal('0')
    tokens: Dict[str, Decimal] = field(default_factory=dict)

@dataclass
class Transaction:
    id: str
    hash: str
    type: TransactionType
    from_address: str
    to_address: str
    amount: Decimal
    token_symbol: str
    gas_used: Optional[int] = None
    gas_price: Optional[Decimal] = None
    status: TransactionStatus = TransactionStatus.PENDING
    timestamp: datetime = field(default_factory=datetime.now)
    block_number: Optional[int] = None
    confirmations: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Wallet:
    id: str
    name: str
    type: WalletType
    addresses: List[WalletAddress] = field(default_factory=list)
    transactions: List[Transaction] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_sync: Optional[datetime] = None

class KeyManager:
    def __init__(self, master_password: str):
        self.master_password = master_password
        self.salt = os.urandom(16)
        self.key = self._derive_key(master_password)

    def _derive_key(self, password: str) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def encrypt_data(self, data: str) -> str:
        f = Fernet(self.key)
        return f.encrypt(data.encode()).decode()

    def decrypt_data(self, encrypted_data: str) -> str:
        f = Fernet(self.key)
        return f.decrypt(encrypted_data.encode()).decode()

    def generate_seed_phrase(self, entropy_bits: int = 256) -> str:
        entropy = secrets.token_bytes(entropy_bits // 8)
        return self._entropy_to_mnemonic(entropy)

    def _entropy_to_mnemonic(self, entropy: bytes) -> str:
        wordlist = [
            "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
            "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
            "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
            "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
            "advice", "aerobic", "affair", "afford", "afraid", "again", "agent", "agree",
            "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
            "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also",
            "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst",
            "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce",
            "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart",
            "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area",
            "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
            "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect",
            "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack",
            "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author",
            "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away",
            "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
            "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar",
            "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach",
            "bean", "beauty", "because", "become", "beef", "before", "begin", "behave",
            "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray",
            "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
            "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast",
            "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur",
            "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book",
            "boom", "born", "borrow", "boss", "bottom", "bounce", "box", "boy",
            "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick",
            "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
            "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build",
            "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst",
            "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin",
            "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp",
            "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon",
            "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet",
            "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat",
            "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave",
            "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair",
            "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat",
            "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief",
            "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn",
            "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap",
            "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client",
            "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth",
            "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast",
            "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column",
            "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct",
            "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool",
            "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton",
            "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack",
            "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy",
            "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic",
            "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble",
            "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard",
            "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle",
            "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter",
            "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide",
            "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree",
            "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart",
            "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design",
            "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote",
            "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ",
            "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree",
            "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert",
            "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin",
            "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove",
            "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift",
            "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck",
            "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic",
            "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy",
            "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg",
            "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant",
            "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion",
            "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse",
            "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist",
            "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope",
            "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error",
            "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence",
            "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite",
            "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist",
            "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express",
            "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade",
            "faint", "faith", "fall", "false", "fame", "family", "famous", "fan",
            "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue",
            "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel",
            "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction",
            "field", "figure", "file", "film", "filter", "final", "find", "fine",
            "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit",
            "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee",
            "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush",
            "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food",
            "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward",
            "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh",
            "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit",
            "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain",
            "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic",
            "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general",
            "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift",
            "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare",
            "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow",
            "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel",
            "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape",
            "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery",
            "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar",
            "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand",
            "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk",
            "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello",
            "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint",
            "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday",
            "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse",
            "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human",
            "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt",
            "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore",
            "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact",
            "impose", "improve", "impulse", "inch", "include", "income", "increase", "index",
            "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit",
            "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry",
            "insane", "insect", "inside", "inspire", "install", "intact", "interest", "interior",
            "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue",
            "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans",
            "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge",
            "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen",
            "keep", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit",
            "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know",
            "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language",
            "laptop", "large", "laser", "last", "late", "laugh", "laundry", "lava",
            "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn",
            "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon",
            "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar",
            "liberty", "library", "license", "life", "lift", "light", "like", "limb",
            "limit", "link", "lion", "liquid", "list", "little", "live", "lizard",
            "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long",
            "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage",
            "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic",
            "magnet", "maid", "mail", "main", "major", "make", "mammal", "man",
            "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march",
            "margin", "marine", "market", "marriage", "mask", "mass", "master", "match",
            "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean",
            "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member",
            "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh",
            "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic",
            "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss",
            "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom",
            "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more",
            "morning", "mosquito", "mother", "motion", "mountain", "mouse", "move", "movie",
            "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music",
            "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin",
            "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative",
            "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral",
            "never", "news", "next", "nice", "night", "noble", "noise", "nominee",
            "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice",
            "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey",
            "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean",
            "october", "odor", "off", "offer", "office", "often", "oil", "okay",
            "old", "olive", "olympic", "omit", "once", "one", "onion", "online",
            "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit",
            "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich",
            "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over",
            "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page",
            "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper",
            "parade", "parent", "park", "parrot", "party", "pass", "patch", "path",
            "patient", "patron", "pause", "pave", "payment", "peace", "peanut", "pear",
            "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect",
            "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano",
            "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink",
            "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic",
            "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem",
            "poet", "point", "polar", "pole", "police", "pond", "pony", "pool",
            "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty",
            "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present",
            "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison",
            "private", "prize", "problem", "process", "produce", "profit", "program", "project",
            "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public",
            "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy",
            "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid",
            "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote",
            "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain",
            "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare",
            "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason",
            "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce",
            "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax",
            "release", "relief", "rely", "remain", "remember", "remind", "remove", "render",
            "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require",
            "rescue", "result", "return", "reunion", "reveal", "review", "reward", "rhythm",
            "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right",
            "rigid", "ring", "riot", "rise", "risk", "ritual", "rival", "river",
            "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie",
            "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber",
            "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle",
            "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute",
            "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save",
            "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school",
            "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub",
            "sea", "search", "season", "seat", "second", "secret", "section", "security",
            "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense",
            "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow",
            "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift",
            "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short",
            "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick",
            "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver",
            "similar", "simple", "since", "sing", "siren", "sister", "situate", "six",
            "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull",
            "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim",
            "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke",
            "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer",
            "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution",
            "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound",
            "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak",
            "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike",
            "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot",
            "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable",
            "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state",
            "stay", "steak", "steel", "stem", "step", "stick", "still", "sting",
            "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street",
            "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject",
            "submit", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun",
            "sunny", "sunset", "supply", "supreme", "sure", "surface", "surge", "surprise",
            "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm",
            "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol",
            "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent",
            "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi",
            "teach", "team", "tell", "ten", "tenant", "tennis", "thank", "that",
            "theme", "then", "theory", "there", "they", "thing", "this", "thought",
            "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger",
            "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title",
            "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token",
            "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top",
            "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist",
            "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic",
            "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree",
            "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy",
            "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try",
            "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle",
            "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical",
            "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo",
            "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown",
            "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon",
            "upper", "upset", "urban", "urge", "usage", "use", "used", "useful",
            "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley",
            "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle",
            "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very",
            "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view",
            "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual",
            "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote",
            "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want",
            "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave",
            "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding",
            "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat",
            "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife",
            "wild", "will", "win", "window", "wine", "wing", "wink", "winner",
            "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman",
            "wonder", "wood", "wool", "word", "work", "world", "worry", "worth",
            "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year",
            "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"
        ]

        entropy_int = int.from_bytes(entropy, 'big')
        words = []
        for i in range(len(entropy) * 8 // 11):
            words.append(wordlist[entropy_int % 2048])
            entropy_int //= 2048

        return ' '.join(words)

class WalletManager:
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager
        self.wallets: Dict[str, Wallet] = {}
        self.encrypted_data: Dict[str, str] = {}

    def create_wallet(self, name: str, wallet_type: WalletType = WalletType.HOT) -> str:
        wallet_id = str(uuid.uuid4())
        wallet = Wallet(
            id=wallet_id,
            name=name,
            type=wallet_type
        )

        if wallet_type == WalletType.HOT:
            seed_phrase = self.key_manager.generate_seed_phrase()
            encrypted_seed = self.key_manager.encrypt_data(seed_phrase)
            self.encrypted_data[wallet_id] = encrypted_seed

        self.wallets[wallet_id] = wallet
        return wallet_id

    def add_address(self, wallet_id: str, address: str, derivation_path: str, public_key: str) -> bool:
        if wallet_id not in self.wallets:
            return False

        wallet_address = WalletAddress(
            address=address,
            derivation_path=derivation_path,
            public_key=public_key
        )

        self.wallets[wallet_id].addresses.append(wallet_address)
        return True

    def update_balance(self, wallet_id: str, address: str, token_symbol: str, amount: Decimal) -> bool:
        if wallet_id not in self.wallets:
            return False

        wallet = self.wallets[wallet_id]
        for addr in wallet.addresses:
            if addr.address == address:
                if token_symbol == "ETH":
                    addr.balance = amount
                else:
                    addr.tokens[token_symbol] = amount
                return True
        return False

    def add_transaction(self, wallet_id: str, transaction: Transaction) -> bool:
        if wallet_id not in self.wallets:
            return False

        self.wallets[wallet_id].transactions.append(transaction)
        return True

    def get_wallet_balance(self, wallet_id: str, include_tokens: bool = True) -> Dict[str, Decimal]:
        if wallet_id not in self.wallets:
            return {}

        wallet = self.wallets[wallet_id]
        balances = {}

        for addr in wallet.addresses:
            balances["ETH"] = balances.get("ETH", Decimal('0')) + addr.balance
            if include_tokens:
                for token, amount in addr.tokens.items():
                    balances[token] = balances.get(token, Decimal('0')) + amount

        return balances

    def get_transaction_history(self, wallet_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if wallet_id not in self.wallets:
            return []

        wallet = self.wallets[wallet_id]
        transactions = sorted(wallet.transactions, key=lambda x: x.timestamp, reverse=True)

        return [
            {
                'id': tx.id,
                'hash': tx.hash,
                'type': tx.type.value,
                'from_address': tx.from_address,
                'to_address': tx.to_address,
                'amount': float(tx.amount),
                'token_symbol': tx.token_symbol,
                'status': tx.status.value,
                'timestamp': tx.timestamp.isoformat(),
                'gas_used': tx.gas_used,
                'confirmations': tx.confirmations
            }
            for tx in transactions[:limit]
        ]

    def export_wallet_data(self, wallet_id: str) -> Optional[str]:
        if wallet_id not in self.wallets:
            return None

        wallet = self.wallets[wallet_id]
        data = {
            'id': wallet.id,
            'name': wallet.name,
            'type': wallet.type.value,
            'addresses': [
                {
                    'address': addr.address,
                    'derivation_path': addr.derivation_path,
                    'balance': float(addr.balance),
                    'tokens': {k: float(v) for k, v in addr.tokens.items()}
                }
                for addr in wallet.addresses
            ],
            'created_at': wallet.created_at.isoformat()
        }

        return self.key_manager.encrypt_data(json.dumps(data))

    def import_wallet_data(self, encrypted_data: str) -> Optional[str]:
        try:
            decrypted_data = self.key_manager.decrypt_data(encrypted_data)
            data = json.loads(decrypted_data)

            wallet = Wallet(
                id=data['id'],
                name=data['name'],
                type=WalletType(data['type']),
                created_at=datetime.fromisoformat(data['created_at'])
            )

            for addr_data in data['addresses']:
                address = WalletAddress(
                    address=addr_data['address'],
                    derivation_path=addr_data['derivation_path'],
                    balance=Decimal(str(addr_data['balance'])),
                    public_key=""
                )
                address.tokens = {k: Decimal(str(v)) for k, v in addr_data['tokens'].items()}
                wallet.addresses.append(address)

            self.wallets[wallet.id] = wallet
            return wallet.id
        except Exception as e:
            print(f"Import failed: {e}")
            return None

    def get_wallet_stats(self, wallet_id: str) -> Dict[str, Any]:
        if wallet_id not in self.wallets:
            return {}

        wallet = self.wallets[wallet_id]
        total_transactions = len(wallet.transactions)
        confirmed_transactions = len([tx for tx in wallet.transactions if tx.status == TransactionStatus.CONFIRMED])
        pending_transactions = len([tx for tx in wallet.transactions if tx.status == TransactionStatus.PENDING])

        balances = self.get_wallet_balance(wallet_id)

        return {
            'wallet_id': wallet_id,
            'name': wallet.name,
            'type': wallet.type.value,
            'total_addresses': len(wallet.addresses),
            'total_transactions': total_transactions,
            'confirmed_transactions': confirmed_transactions,
            'pending_transactions': pending_transactions,
            'balances': {k: float(v) for k, v in balances.items()},
            'created_at': wallet.created_at.isoformat(),
            'last_sync': wallet.last_sync.isoformat() if wallet.last_sync else None
        }

    def backup_wallet(self, wallet_id: str, backup_path: str) -> bool:
        data = self.export_wallet_data(wallet_id)
        if not data:
            return False

        try:
            with open(backup_path, 'w') as f:
                f.write(data)
            return True
        except Exception as e:
            print(f"Backup failed: {e}")
            return False

    def restore_wallet(self, backup_path: str) -> Optional[str]:
        try:
            with open(backup_path, 'r') as f:
                encrypted_data = f.read()
            return self.import_wallet_data(encrypted_data)
        except Exception as e:
            print(f"Restore failed: {e}")
            return None

async def main():
    key_manager = KeyManager("my_secure_password")
    wallet_manager = WalletManager(key_manager)

    wallet_id = wallet_manager.create_wallet("My DeFi Wallet")
    print(f"Created wallet: {wallet_id}")

    wallet_manager.add_address(wallet_id, "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "m/44'/60'/0'/0/0", "public_key_here")
    wallet_manager.update_balance(wallet_id, "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "ETH", Decimal('1.5'))

    transaction = Transaction(
        id=str(uuid.uuid4()),
        hash="0x123...",
        type=TransactionType.SEND,
        from_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        to_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44f",
        amount=Decimal('0.5'),
        token_symbol="ETH"
    )

    wallet_manager.add_transaction(wallet_id, transaction)

    print("Wallet stats:", wallet_manager.get_wallet_stats(wallet_id))

if __name__ == "__main__":
    asyncio.run(main())