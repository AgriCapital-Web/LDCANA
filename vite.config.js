import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
 plugins:[
  react(),
  VitePWA({
   strategies:'injectManifest',
   srcDir:'src',
   filename:'sw.js',
   registerType:'autoUpdate',
   includeAssets:[],
   manifest:{
    name:'Les Délices de CANA',
    short_name:'Délices de CANA',
    description:'La carte et les réservations des Délices de CANA.',
    theme_color:'#FBF7F0',
    background_color:'#FBF7F0',
    display:'standalone',
    lang:'fr',
    start_url:'/',
    scope:'/',
    icons:[
      {src:'/api/cana-logo',sizes:'any',purpose:'any'}
    ]
   },
   injectManifest:{globPatterns:['**/*.{js,css,html,svg,png,webp,woff2}']}
  })
 ]
});