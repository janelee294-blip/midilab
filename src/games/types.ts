import { ComponentType } from 'react';

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  component: ComponentType;
  badge?: 'new' | 'soon';
  pointRule?: string;
}
