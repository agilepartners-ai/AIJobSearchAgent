import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface Interactive3DVisualizationProps {
  className?: string;
}

const Interactive3DVisualization: React.FC<Interactive3DVisualizationProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const satellitesRef = useRef<THREE.Group[]>([]);
  const mainPlanesRef = useRef<THREE.Group | null>(null);  // Enhanced materials for better visual appeal - reduced opacity for background use
  const materials = useMemo(() => ({
    mainPlane: new THREE.MeshBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.4, // Reduced from 0.7
      side: THREE.DoubleSide
    }),
    satellite: new THREE.MeshBasicMaterial({ 
      color: 0x8b5cf6, 
      transparent: true, 
      opacity: 0.3, // Reduced from 0.5
      side: THREE.DoubleSide
    }),
    // Additional materials for visual hierarchy
    centralNode: new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.5, // Reduced from 0.9
      side: THREE.DoubleSide
    }),
    outerRing: new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.3, // Reduced from 0.5
      side: THREE.DoubleSide
    })
  }), []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;    // Camera setup - optimized for larger background coverage
    const camera = new THREE.PerspectiveCamera(
      85, // Increased field of view for wider coverage
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8); // Moved closer for larger appearance

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);    // Create main plane structure
    const mainPlaneGroup = new THREE.Group();
    mainPlanesRef.current = mainPlaneGroup;
    const planeGeometry = new THREE.PlaneGeometry(0.8, 0.8);
      // Symmetrical, mathematically structured positions for visual appeal
    const positions = [
      // Central core
      { x: 0, y: 0, z: 0 },
        // Primary hexagonal ring (6 points) - slightly expanded
      { x: 2.5, y: 0, z: 0 },
      { x: 1.25, y: 2.165, z: 0 },
      { x: -1.25, y: 2.165, z: 0 },
      { x: -2.5, y: 0, z: 0 },
      { x: -1.25, y: -2.165, z: 0 },
      { x: 1.25, y: -2.165, z: 0 },
      
      // Secondary octagonal ring (8 points) - expanded radius
      { x: 4.5, y: 0, z: 1 },
      { x: 3.182, y: 3.182, z: -1 },
      { x: 0, y: 4.5, z: 1 },
      { x: -3.182, y: 3.182, z: -1 },
      { x: -4.5, y: 0, z: 1 },
      { x: -3.182, y: -3.182, z: -1 },
      { x: 0, y: -4.5, z: 1 },
      { x: 3.182, y: -3.182, z: -1 },
      
      // Tertiary layer - positioned in 3D space (8 points) - expanded
      { x: 2, y: 2, z: 3 },
      { x: -2, y: 2, z: 3 },
      { x: -2, y: -2, z: 3 },
      { x: 2, y: -2, z: 3 },
      { x: 2, y: 2, z: -3 },
      { x: -2, y: 2, z: -3 },
      { x: -2, y: -2, z: -3 },
      { x: 2, y: -2, z: -3 },
      
      // Outer constellation points (8 points) - creating more depth
      { x: 6, y: 2, z: 2 },
      { x: 2, y: 6, z: -2 },
      { x: -2, y: 6, z: 2 },
      { x: -6, y: 2, z: -2 },
      { x: -6, y: -2, z: 2 },
      { x: -2, y: -6, z: -2 },
      { x: 2, y: -6, z: 2 },
      { x: 6, y: -2, z: -2 }
    ];

    const planes: THREE.Mesh[] = [];
      // Create main planes with varied sizes for visual hierarchy
    positions.forEach((pos, index) => {
      let geometry = planeGeometry;
      let material = materials.mainPlane.clone();
        // Create visual hierarchy with different sizes - reduced opacity for background
      if (index === 0) {
        // Central node - larger and more prominent
        geometry = new THREE.PlaneGeometry(1.2, 1.2);
        material.opacity = 0.6; // Reduced from 0.9
        material.color.setHex(0x60a5fa); // Lighter blue for center
      } else if (index <= 6) {
        // Primary ring - standard size
        geometry = new THREE.PlaneGeometry(0.9, 0.9);
        material.opacity = 0.5; // Reduced from 0.8
      } else if (index <= 14) {
        // Secondary ring - medium size
        geometry = new THREE.PlaneGeometry(0.7, 0.7);
        material.opacity = 0.4; // Reduced from 0.7
      } else if (index <= 22) {
        // Tertiary layer - smaller
        geometry = new THREE.PlaneGeometry(0.6, 0.6);
        material.opacity = 0.3; // Reduced from 0.6
        material.color.setHex(0x8b5cf6); // Purple for depth layer
      } else {
        // Outer constellation - smallest
        geometry = new THREE.PlaneGeometry(0.5, 0.5);
        material.opacity = 0.25; // Reduced from 0.5
        material.color.setHex(0xa855f7); // Lighter purple for outer ring
      }
      
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(pos.x, pos.y, pos.z);
      
      // Symmetrical rotation based on position
      plane.rotation.x = Math.sin(index * 0.5) * 0.3;
      plane.rotation.y = Math.cos(index * 0.5) * 0.3;
      plane.rotation.z = index * 0.2;
      
      plane.userData = { originalPosition: pos, index, layer: Math.floor(index / 8) };
      planes.push(plane);
      mainPlaneGroup.add(plane);    });

    // Create symmetrical satellite arrangements
    const satelliteGeometry = new THREE.PlaneGeometry(0.25, 0.25);
    const smallSatelliteGeometry = new THREE.PlaneGeometry(0.18, 0.18);
    const microSatelliteGeometry = new THREE.PlaneGeometry(0.12, 0.12);
    satellitesRef.current = [];
    
    planes.forEach((plane, planeIndex) => {
      const satelliteGroup = new THREE.Group();
      const layer = Math.floor(planeIndex / 8);
      
      // Different satellite patterns for different layers
      let numSatellites = 6; // Default symmetrical number
      let baseRadius = 1.2;
      
      if (planeIndex === 0) {
        // Central node gets more satellites in two rings
        numSatellites = 8;
        baseRadius = 1.5;
      } else if (layer === 1) {
        numSatellites = 6;
        baseRadius = 1.0;
      } else if (layer === 2) {
        numSatellites = 4;
        baseRadius = 0.8;
      } else {
        numSatellites = 3;
        baseRadius = 0.6;
      }
      
      for (let i = 0; i < numSatellites; i++) {
        const angle = (i / numSatellites) * Math.PI * 2;
          // Create inner ring
        const satellite1 = new THREE.Mesh(
          smallSatelliteGeometry, 
          materials.satellite.clone()
        );
        satellite1.material.opacity = 0.3; // Reduced from 0.6
        
        const radius1 = baseRadius;
        satellite1.position.set(
          plane.position.x + Math.cos(angle) * radius1,
          plane.position.y + Math.sin(angle) * radius1,
          plane.position.z + Math.sin(angle * 2) * 0.3
        );
        
        satellite1.userData = {
          originalPosition: satellite1.position.clone(),
          parentPlaneIndex: planeIndex,
          angle: angle,
          radius: radius1,
          rotationSpeed: 0.01 + layer * 0.005,
          ring: 'inner'
        };
        
        satelliteGroup.add(satellite1);
        
        // Add outer ring for important nodes
        if (planeIndex === 0 || layer === 1) {          const satellite2 = new THREE.Mesh(
            microSatelliteGeometry, 
            materials.satellite.clone()
          );
          satellite2.material.opacity = 0.2; // Reduced from 0.4
          satellite2.material.color.setHex(0x60a5fa);
          
          const radius2 = baseRadius * 1.6;
          const angle2 = angle + Math.PI / numSatellites; // Offset for visual appeal
          
          satellite2.position.set(
            plane.position.x + Math.cos(angle2) * radius2,
            plane.position.y + Math.sin(angle2) * radius2,
            plane.position.z + Math.cos(angle2 * 2) * 0.4
          );
          
          satellite2.userData = {
            originalPosition: satellite2.position.clone(),
            parentPlaneIndex: planeIndex,
            angle: angle2,
            radius: radius2,
            rotationSpeed: -0.008 + layer * 0.003,
            ring: 'outer'
          };
          
          satelliteGroup.add(satellite2);
        }
      }
      
      satellitesRef.current.push(satelliteGroup);
      scene.add(satelliteGroup);
    });    scene.add(mainPlaneGroup);

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    // Animation loop
    const animate = () => {
      if (!scene || !camera || !renderer) return;

      // Rotate main structure
      if (mainPlaneGroup) {
        mainPlaneGroup.rotation.y += 0.005;
        mainPlaneGroup.rotation.x += 0.002;
      }      // Symmetrical animation patterns
      planes.forEach((plane, index) => {
        const layer = Math.floor(index / 8);
        const angleInLayer = (index % 8) * (Math.PI / 4);
        
        // Layer-based rotation speeds for symmetry
        plane.rotation.z += 0.006 * (layer % 2 === 0 ? 1 : -1);
        plane.rotation.x += 0.003 * Math.sin(angleInLayer);
        plane.rotation.y += 0.002 * Math.cos(angleInLayer);
        
        // Breathing effect for central node
        if (index === 0) {
          const breathe = Math.sin(Date.now() * 0.002) * 0.1 + 1;
          plane.scale.setScalar(breathe);
        }
        
        // Gentle wave motion for outer layers
        if (layer >= 2) {
          plane.position.y += Math.sin(Date.now() * 0.001 + angleInLayer) * 0.01;
          plane.position.z += Math.cos(Date.now() * 0.0015 + angleInLayer) * 0.01;
        }
      });      // Symmetrical satellite rotation
      satellitesRef.current.forEach((satelliteGroup) => {
        satelliteGroup.children.forEach((satellite) => {
          const mesh = satellite as THREE.Mesh;
          const userData = mesh.userData;
          
          // Orbit around parent plane
          const time = Date.now() * 0.0005;
          const currentAngle = userData.angle + time * (userData.ring === 'outer' ? -0.5 : 1);
          const currentRadius = userData.radius * (1 + Math.sin(time + userData.angle) * 0.1);
          
          const parentPlane = planes[userData.parentPlaneIndex];
          mesh.position.x = parentPlane.position.x + Math.cos(currentAngle) * currentRadius;
          mesh.position.y = parentPlane.position.y + Math.sin(currentAngle) * currentRadius;
          mesh.position.z = parentPlane.position.z + Math.sin(currentAngle * 2) * 0.3;
          
          // Individual rotation
          mesh.rotation.z += userData.rotationSpeed || 0.01;
        });
      });

      // Raycasting for hover effects
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(planes, false);      // Reset all elements to original state with smooth transitions
      satellitesRef.current.forEach((satelliteGroup) => {
        satelliteGroup.children.forEach((satellite) => {
          const mesh = satellite as THREE.Mesh;
          mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
        });
      });
      
      // Reset plane scales
      planes.forEach((plane) => {
        const targetScale = plane.userData.index === 0 ? 
          (Math.sin(Date.now() * 0.002) * 0.1 + 1) : 1;
        plane.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
      });// Enhanced hover effects with ripple animation
      if (intersects.length > 0) {
        const hoveredPlaneIndex = intersects[0].object.userData.index;
        const hoveredPlane = planes[hoveredPlaneIndex];
        const satelliteGroup = satellitesRef.current[hoveredPlaneIndex];
        
        // Highlight hovered plane
        hoveredPlane.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.1);
        
        // Animate satellites with ripple effect
        if (satelliteGroup) {
          satelliteGroup.children.forEach((satellite, index) => {
            const mesh = satellite as THREE.Mesh;
            const userData = mesh.userData;
            const delay = index * 0.1;
            
            // Create outward expansion with staggered timing
            const expansionFactor = 1.2 + Math.sin(Date.now() * 0.01 + delay) * 0.3;
            const direction = userData.originalPosition.clone()
              .sub(hoveredPlane.position)
              .normalize()
              .multiplyScalar(userData.radius * expansionFactor);
            
            const targetPos = hoveredPlane.position.clone().add(direction);
            mesh.position.lerp(targetPos, 0.1);
            mesh.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
            
            // Add rotation boost
            mesh.rotation.z += 0.02;
          });
        }
        
        // Highlight connected planes with dimmer effect
        for (let i = 0; i < planes.length; i++) {
          if (i !== hoveredPlaneIndex) {
            const distance = planes[i].position.distanceTo(hoveredPlane.position);
            if (distance < 4.0) {
              planes[i].scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.05);
            }
          }
        }
      }

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    // Event listeners
    window.addEventListener('resize', handleResize);
    mountRef.current.addEventListener('mousemove', handleMouseMove);

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousemove', handleMouseMove);
        if (renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
        // Cleanup
      satelliteGeometry.dispose();
      smallSatelliteGeometry.dispose();
      microSatelliteGeometry.dispose();
      Object.values(materials).forEach(material => material.dispose());
      renderer.dispose();
    };
  }, [materials]);
  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full three-container ${className}`}
      style={{ 
        minHeight: '400px',
        background: 'transparent',
        overflow: 'hidden'
      }}
    />
  );
};

export default Interactive3DVisualization;
