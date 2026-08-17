export type PetCategory = "cats" | "dogs" | "birds" | "rabbits" | "others";

export type PetPurpose = "adoption" | "mating" | "lost" | "rescue";

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  password?: string; // Stored securely locally
  favoritePetIds: string[];
  role?: "user" | "admin";
  createdAt: string;
}

export interface PetListing {
  id: string;
  name: string;
  category: PetCategory;
  breed: string;
  age: string;
  location: string;
  purpose: PetPurpose;
  imageUrl: string;
  imageUrls?: string[]; // Multiple images support
  description: string;
  healthStatus: string;
  vaccinated: boolean;
  ownerName: string;
  ownerPhone: string;
  ownerId?: string; // Optional field to link with user accounts
  status?: "available" | "adopted" | "found" | "rescued" | "completed";
  rescueStory?: string; // Story for rescued pets
  videoUrl?: string; // Optional video clip URL
  lostDate?: string; // Date the pet went missing (YYYY-MM-DD)
  lostTime?: string; // Time the pet went missing (HH:MM)
  createdAt: string;
}

export interface ClinicComment {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface Clinic {
  id: string;
  name: string;
  city: string;
  phone: string;
  address: string;
  rating: number;
  hasEmergency: boolean;
  images?: string[];
  services?: string[];
  comments?: ClinicComment[];
  description?: string;
  workingHours?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  likes: number;
  commentsCount: number;
  category: "tips" | "stories" | "general";
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  createdAt: string;
}
