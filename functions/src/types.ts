export interface PressIssue {
  id: string;
  title: string;
  narrative: string;
  matchedProductIds: string[];
  createdAt: number;
  userId: string;
  signalStrength: string;
  trajectoryId: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  affiliateLink: string;
  embedding: number[];
  category: string;
  tags: string[];
}
