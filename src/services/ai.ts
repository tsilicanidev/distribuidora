import * as tf from '@tensorflow/tfjs';
import * as natural from 'natural';
import { supabase } from '../lib/supabase';

class AIService {
  private tokenizer: natural.WordTokenizer;
  private classifier: natural.BayesClassifier;
  private model: tf.LayersModel | null = null;
  private isTraining = false;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.initializeSystem();
  }

  private async initializeSystem() {
    await this.trainClassifier();
    await this.initializeNeuralNetwork();
    this.startAutonomousMonitoring();
  }

  private async trainClassifier() {
    // Train for pattern recognition
    this.classifier.addDocument('stock low quantity alert warning', 'stock_issue');
    this.classifier.addDocument('delivery delayed late missing', 'delivery_issue');
    this.classifier.addDocument('price high expensive cost', 'pricing_issue');
    this.classifier.addDocument('quality damaged broken defective', 'quality_issue');
    this.classifier.train();
  }

  private async initializeNeuralNetwork() {
    // Create LSTM model for time series prediction
    this.model = tf.sequential();
    this.model.add(tf.layers.lstm({
      units: 32,
      inputShape: [30, 1], // 30 days of historical data
      returnSequences: true
    }));
    this.model.add(tf.layers.dropout(0.2));
    this.model.add(tf.layers.lstm({
      units: 16,
      returnSequences: false
    }));
    this.model.add(tf.layers.dense({ units: 1 }));

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['accuracy']
    });
  }

  private startAutonomousMonitoring() {
    // Run continuous monitoring every 5 minutes
    setInterval(async () => {
      await this.monitorSystem();
    }, 5 * 60 * 1000);
  }

  private async monitorSystem() {
    try {
      // Monitor stock levels
      await this.checkStockLevels();

      // Optimize delivery routes
      await this.optimizeDeliveryRoutes();

      // Generate product recommendations
      await this.generateRecommendations();

      // Detect anomalies
      await this.detectSystemAnomalies();

      // Update AI model
      if (!this.isTraining) {
        this.isTraining = true;
        await this.updateAIModel();
        this.isTraining = false;
      }
    } catch (error) {
      console.error('AI monitoring error:', error);
    }
  }

  private async checkStockLevels() {
    const { data: products } = await supabase
      .from('products')
      .select('*');

    if (!products) return;

    for (const product of products) {
      const prediction = await this.predictStockLevels(product.id);
      
      if (prediction.predictedDemand > product.stock_quantity) {
        // Create stock alert
        await supabase
          .from('stock_alerts')
          .insert([{
            product_id: product.id,
            type: 'low_stock',
            message: `Low stock alert for ${product.name}. Current: ${product.stock_quantity}, Predicted demand: ${prediction.predictedDemand}`,
            suggested_reorder: prediction.suggestedReorderPoint
          }]);
      }
    }
  }

  private async optimizeDeliveryRoutes() {
    const { data: deliveries } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('status', 'pending');

    if (!deliveries) return;

    for (const delivery of deliveries) {
      const optimizedRoute = await this.optimizeDeliveryRoute(delivery.delivery_points);
      
      // Update delivery route
      await supabase
        .from('delivery_notes')
        .update({ 
          optimized_route: optimizedRoute,
          estimated_completion: optimizedRoute[optimizedRoute.length - 1].estimatedArrival
        })
        .eq('id', delivery.id);
    }
  }

  private async generateRecommendations() {
    const { data: customers } = await supabase
      .from('customers')
      .select('*');

    if (!customers) return;

    for (const customer of customers) {
      const recommendations = await this.suggestProducts(customer.id);
      
      // Store recommendations
      await supabase
        .from('product_recommendations')
        .upsert(recommendations.map(rec => ({
          customer_id: customer.id,
          product_id: rec.productId,
          score: rec.score,
          reason: rec.reason,
          created_at: new Date().toISOString()
        })));
    }
  }

  private async detectSystemAnomalies() {
    // Analyze system metrics
    const metrics = await this.collectSystemMetrics();
    const { anomalies } = await this.detectAnomalies(metrics);

    if (anomalies.length > 0) {
      // Create alerts for anomalies
      await supabase
        .from('system_alerts')
        .insert(anomalies.map(anomaly => ({
          type: 'anomaly',
          metric: anomaly.metric,
          value: anomaly.value,
          threshold: anomaly.threshold,
          created_at: new Date().toISOString()
        })));
    }
  }

  private async updateAIModel() {
    // Get historical data
    const { data: history } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: true });

    if (!history) return;

    // Prepare training data
    const data = history.map(h => h.quantity);
    const tensor = tf.tensor2d(data, [data.length, 1]);

    // Update model
    await this.model?.fit(tensor, tensor, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2
    });
  }

  private async collectSystemMetrics() {
    // Collect various system metrics
    const [stockMovements, orders, deliveries] = await Promise.all([
      supabase.from('stock_movements').select('*'),
      supabase.from('sales_orders').select('*'),
      supabase.from('delivery_notes').select('*')
    ]);

    return [
      { metric: 'stock_movements', value: stockMovements.data?.length || 0 },
      { metric: 'orders', value: orders.data?.length || 0 },
      { metric: 'deliveries', value: deliveries.data?.length || 0 }
    ];
  }

  async predictStockLevels(productId: string): Promise<{
    predictedDemand: number;
    suggestedReorderPoint: number;
    confidence: number;
  }> {
    try {
      // Get historical stock movements
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (!movements || movements.length < 30) {
        throw new Error('Insufficient data for prediction');
      }

      // Prepare data for TensorFlow.js
      const quantities = movements.map(m => m.quantity);
      const tensor = tf.tensor2d(quantities, [quantities.length, 1]);

      // Create LSTM model
      const model = tf.sequential();
      model.add(tf.layers.lstm({
        units: 32,
        inputShape: [1, 1],
        returnSequences: true
      }));
      model.add(tf.layers.dropout(0.2));
      model.add(tf.layers.lstm({
        units: 16,
        returnSequences: false
      }));
      model.add(tf.layers.dense({ units: 1 }));

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });

      // Train model
      await model.fit(tensor, tensor, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2
      });

      // Make prediction
      const lastQuantity = quantities[quantities.length - 1];
      const prediction = model.predict(tf.tensor2d([[lastQuantity]], [1, 1, 1])) as tf.Tensor;
      const predictedDemand = Math.round(prediction.dataSync()[0]);

      // Calculate confidence and reorder point
      const stdDev = tf.moments(tensor).variance.sqrt().dataSync()[0];
      const confidence = 1 - (stdDev / predictedDemand);
      const suggestedReorderPoint = Math.round(predictedDemand + (2 * stdDev));

      return {
        predictedDemand,
        suggestedReorderPoint,
        confidence
      };
    } catch (error) {
      console.error('Error predicting stock levels:', error);
      return {
        predictedDemand: 0,
        suggestedReorderPoint: 0,
        confidence: 0
      };
    }
  }

  async optimizeDeliveryRoute(deliveryPoints: Array<{
    lat: number;
    lng: number;
    sequence?: number;
    timeWindow?: { start: string; end: string };
    weight?: number;
  }>): Promise<Array<{
    lat: number;
    lng: number;
    sequence: number;
    estimatedArrival: string;
  }>> {
    const populationSize = 100;
    const generations = 200;
    const mutationRate = 0.1;
    let population = this.initializePopulation(deliveryPoints, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      population = this.evolvePopulation(population, deliveryPoints);
      
      // Apply mutation
      if (Math.random() < mutationRate) {
        population = population.map(route => this.mutateRoute(route));
      }
    }

    // Get best route
    const bestRoute = population[0];
    
    // Calculate estimated arrival times
    return deliveryPoints.map((point, index) => ({
      ...point,
      sequence: bestRoute[index],
      estimatedArrival: this.calculateEstimatedArrival(
        point,
        index > 0 ? deliveryPoints[bestRoute[index - 1]] : point,
        point.timeWindow
      )
    }));
  }

  async suggestProducts(customerId: string): Promise<Array<{
    productId: string;
    score: number;
    reason: string;
  }>> {
    try {
      // Get customer's order history
      const { data: orders } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items (
            product_id,
            quantity,
            products (
              name,
              category
            )
          )
        `)
        .eq('customer_id', customerId);

      if (!orders || orders.length === 0) {
        return [];
      }

      // Create customer profile vector
      const customerProfile = this.createCustomerProfile(orders);

      // Get all products
      const { data: products } = await supabase
        .from('products')
        .select('*');

      if (!products) return [];

      // Calculate similarity scores
      const recommendations = products
        .filter(product => !customerProfile.purchasedProducts.has(product.id))
        .map(product => {
          const similarityScore = this.calculateProductSimilarity(
            product,
            customerProfile
          );

          const reason = this.generateRecommendationReason(
            product,
            customerProfile
          );

          return {
            productId: product.id,
            score: similarityScore,
            reason
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return recommendations;
    } catch (error) {
      console.error('Error suggesting products:', error);
      return [];
    }
  }

  async detectAnomalies(data: any[]): Promise<{
    anomalies: any[];
    confidence: number;
  }> {
    try {
      const tensor = tf.tensor2d(data.map(d => [d.value]));
      const mean = tf.mean(tensor);
      const std = tf.moments(tensor).variance.sqrt();
      
      const zScores = tensor.sub(mean).div(std);
      const anomalyThreshold = 2; // 2 standard deviations

      const anomalies = data.filter((_, i) => 
        Math.abs(zScores.dataSync()[i]) > anomalyThreshold
      );

      const confidence = 1 - (anomalies.length / data.length);

      return {
        anomalies,
        confidence
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return {
        anomalies: [],
        confidence: 0
      };
    }
  }

  private createCustomerProfile(orders: any[]) {
    const purchasedProducts = new Set();
    const categoryPreferences = new Map();
    const priceRange = {
      min: Infinity,
      max: -Infinity,
      avg: 0
    };

    let totalItems = 0;

    orders.forEach(order => {
      order.sales_order_items.forEach((item: any) => {
        purchasedProducts.add(item.product_id);
        
        const category = item.products.category;
        categoryPreferences.set(
          category,
          (categoryPreferences.get(category) || 0) + 1
        );

        priceRange.min = Math.min(priceRange.min, item.unit_price);
        priceRange.max = Math.max(priceRange.max, item.unit_price);
        priceRange.avg += item.unit_price;
        totalItems++;
      });
    });

    priceRange.avg /= totalItems;

    return {
      purchasedProducts,
      categoryPreferences,
      priceRange
    };
  }

  private calculateProductSimilarity(product: any, profile: any): number {
    const categoryScore = profile.categoryPreferences.get(product.category) || 0;
    const priceScore = this.calculatePriceScore(product.price, profile.priceRange);
    
    // Weighted average of scores
    return (categoryScore * 0.7) + (priceScore * 0.3);
  }

  private calculatePriceScore(price: number, priceRange: any): number {
    const priceDiff = Math.abs(price - priceRange.avg);
    const range = priceRange.max - priceRange.min;
    return 1 - (priceDiff / range);
  }

  private generateRecommendationReason(product: any, profile: any): string {
    const categoryCount = profile.categoryPreferences.get(product.category);
    if (categoryCount) {
      return `Based on your interest in ${product.category} products`;
    }
    return 'Based on similar customer preferences';
  }

  private initializePopulation(points: any[], size: number): number[][] {
    const population: number[][] = [];
    for (let i = 0; i < size; i++) {
      population.push(this.randomPermutation(points.length));
    }
    return population;
  }

  private evolvePopulation(population: number[][], points: any[]): number[][] {
    const newPopulation = [...population];
    newPopulation.sort((a, b) => 
      this.calculateRouteCost(a, points) - this.calculateRouteCost(b, points)
    );

    const half = Math.floor(newPopulation.length / 2);
    for (let i = half; i < newPopulation.length; i++) {
      const parent1 = newPopulation[Math.floor(Math.random() * half)];
      const parent2 = newPopulation[Math.floor(Math.random() * half)];
      newPopulation[i] = this.crossover(parent1, parent2);
    }

    return newPopulation;
  }

  private mutateRoute(route: number[]): number[] {
    const mutated = [...route];
    const i = Math.floor(Math.random() * route.length);
    const j = Math.floor(Math.random() * route.length);
    [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    return mutated;
  }

  private crossover(parent1: number[], parent2: number[]): number[] {
    const child = new Array(parent1.length).fill(-1);
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * (parent1.length - start)) + start;

    // Copy a section from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining positions with parent2's genes
    let j = 0;
    for (let i = 0; i < parent2.length; i++) {
      if (j === start) j = end + 1;
      if (!child.includes(parent2[i])) {
        while (j < child.length && child[j] !== -1) j++;
        if (j < child.length) child[j] = parent2[i];
      }
    }

    return child;
  }

  private calculateRouteCost(route: number[], points: any[]): number {
    let cost = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const point1 = points[route[i]];
      const point2 = points[route[i + 1]];
      cost += this.distance(point1.lat, point1.lng, point2.lat, point2.lng);
    }
    return cost;
  }

  private randomPermutation(n: number): number[] {
    const array = Array.from({ length: n }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private calculateEstimatedArrival(
    point: any,
    prevPoint: any,
    timeWindow?: { start: string; end: string }
  ): string {
    const averageSpeed = 40; // km/h
    const distance = this.distance(
      point.lat,
      point.lng,
      prevPoint.lat,
      prevPoint.lng
    );
    const travelTime = distance / averageSpeed;

    const arrival = new Date();
    arrival.setHours(arrival.getHours() + travelTime);

    if (timeWindow) {
      const start = new Date(timeWindow.start);
      const end = new Date(timeWindow.end);

      if (arrival < start) {
        return start.toISOString();
      } else if (arrival > end) {
        return end.toISOString();
      }
    }

    return arrival.toISOString();
  }

  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const aiService = new AIService();