
export interface ProductCost {

  product_id: number;

  purchase_cost: number;

  profit_percentage: number;

  updated_at?: string;

}

export interface ProductCostInput {

  purchase_cost: number;

  profit_percentage: number;

}
