
import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

import {
  Product
} from '../models/product.model';

import { demo } from '../../../data';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  private readonly db =
    inject(SupabaseService).client;

  private readonly bucket = 'b2b-products';

  // =====================================
  // LISTAR PRODUCTOS
  // =====================================

  async listar(): Promise<Product[]> {

    const { data, error } = await this.db
      .from('products')
      .select('*')
      .order('id');

    if (error) {
      throw error;
    }

    return Promise.all(
      (data as Product[]).map(async product => ({
        ...product,
        photo: await this.obtenerImagen(product.image)
      }))
    );

  }

  // =====================================
  // OBTENER IMAGEN
  // =====================================

  async obtenerImagen(image: string): Promise<string> {

    if (!image) {
      return '';
    }

    if (image.startsWith('/img/')) {
      return image;
    }

    const { data, error } = await this.db
      .storage
      .from(this.bucket)
      .createSignedUrl(image, 3600);

    if (error) {
      return '';
    }

    return data.signedUrl;

  }

  // =====================================
  // VALIDAR IMAGEN
  // =====================================

  validarImagen(file: File): void {

    const formatos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      file.size > 2097152 ||
      !formatos.includes(file.type)
    ) {

      throw new Error(
        'Imagen inválida o superior a 2 MB.'
      );

    }

  }

  // =====================================
  // SUBIR IMAGEN
  // =====================================

  async subirImagen(file: File): Promise<string> {

    this.validarImagen(file);

    const extension = file.type
      .split('/')[1]
      .replace('jpeg', 'jpg');

    const nombre =
      `${crypto.randomUUID()}.${extension}`;

    const { error } = await this.db
      .storage
      .from(this.bucket)
      .upload(nombre, file);

    if (error) {
      throw error;
    }

    return nombre;

  }

  // =====================================
  // GUARDAR PRODUCTO
  // =====================================

  async guardar(
    product: Product,
    file: File | null = null
  ): Promise<void> {

    const { id, photo, ...payload } = product;

    if (
      !payload.name.trim() ||
      !payload.brand.trim() ||
      !payload.category.trim() ||
      !Number.isFinite(payload.price) ||
      payload.price < 0 ||
      !Number.isInteger(payload.stock) ||
      payload.stock < 0 ||
      !['USD', 'PEN'].includes(payload.currency)
    ) {
      throw new Error(
        'Revisa los datos del producto.'
      );
    }

    if (
      payload.reference_price !== null &&
      (
        !Number.isFinite(payload.reference_price) ||
        payload.reference_price <= payload.price
      )
    ) {
      throw new Error(
        'El precio referencial real debe superar el final.'
      );
    }

    let uploaded = '';

    try {

      if (file) {

        uploaded = await this.subirImagen(file);

        payload.image = uploaded;

      }

      const result = id

        ? await this.db
          .from('products')
          .update(payload)
          .eq('id', id)
          .select()
          .single()

        : await this.db
          .from('products')
          .insert(payload)
          .select()
          .single();

      if (result.error) {
        throw result.error;
      }

    } catch (error) {

      if (uploaded) {

        await this.db
          .storage
          .from(this.bucket)
          .remove([uploaded]);

      }

      throw error;

    }

  }

  // =====================================
  // ELIMINAR PRODUCTO
  // =====================================

  async eliminar(id: number): Promise<void> {

    const { error } = await this.db
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

  }

  // =====================================
  // IMPORTAR PRODUCTOS DE EJEMPLO
  // =====================================

  async importarEjemplos(): Promise<void> {

    const productos = demo.map(
      ({ id, ...product }) => ({
        ...product,
        currency: 'PEN',
        stock: 0,
        active: false,
        reference_price: null
      })
    );

    const { error } = await this.db
      .from('products')
      .insert(productos);

    if (error) {
      throw error;
    }

  }

}
