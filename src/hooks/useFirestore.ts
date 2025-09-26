import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useFirestore = () => {
  // Get all documents from a collection
  const getCollection = async (collectionName: string, constraints: QueryConstraint[] = []) => {
    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  };

  // Get a single document by ID
  const getDocument = async (collectionName: string, docId: string) => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  };

  // Add a new document
  const addDocument = async (collectionName: string, data: DocumentData) => {
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  };

  // Update a document
  const updateDocument = async (collectionName: string, docId: string, data: Partial<DocumentData>) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  // Delete a document
  const deleteDocument = async (collectionName: string, docId: string) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  return {
    getCollection,
    getDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    // Helper functions for common queries
    where,
    orderBy,
    limit
  };
};

// Hook for real-time collection updates with optimization
export const useFirestoreCollection = (
  collectionName: string, 
  constraints: QueryConstraint[] = [], 
  enabled: boolean = true,
  defaultLimit: number = 50,
  timeConstraintDays: number = 7
) => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // 🚨 EMERGENCY: Manual fetch only, NO real-time listeners
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const collectionRef = collection(db, collectionName);
        
        // Add optimization constraints by default
        const optimizedConstraints = [...constraints];
        
        // Add time constraint if not already present
        const hasTimeConstraint = constraints.some(constraint => 
          constraint.toString().includes('updatedAt') || 
          constraint.toString().includes('createdAt') ||
          constraint.toString().includes('timestamp')
        );
        
        if (!hasTimeConstraint && timeConstraintDays > 0) {
          const timeLimit = new Date();
          timeLimit.setDate(timeLimit.getDate() - timeConstraintDays);
          optimizedConstraints.push(
            where('updatedAt', '>=', timeLimit),
            orderBy('updatedAt', 'desc')
          );
        }
        
        // Add limit if not already present
        const hasLimit = constraints.some(constraint => constraint.toString().includes('limit'));
        if (!hasLimit && defaultLimit > 0) {
          optimizedConstraints.push(limit(defaultLimit));
        }
        
        const q = optimizedConstraints.length > 0 ? query(collectionRef, ...optimizedConstraints) : collectionRef;

        const snapshot = await getDocs(q);
        
        console.log('🔥 Firebase manual fetch:', {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.length
        });
        
        const documents = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          console.log('🔥 Firebase document:', data);
          return data;
        });
        
        console.log('🔥 All Firebase documents:', documents);
        setData(documents);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('🔥 Error fetching Firebase collection:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Single fetch on mount, NO polling
    fetchData();
  }, [collectionName, constraints, enabled, defaultLimit, timeConstraintDays]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      
      const collectionRef = collection(db, collectionName);
      
      // Add optimization constraints by default
      const optimizedConstraints = [...constraints];
      
      // Add time constraint if not already present
      const hasTimeConstraint = constraints.some(constraint => 
        constraint.toString().includes('updatedAt') || 
        constraint.toString().includes('createdAt') ||
        constraint.toString().includes('timestamp')
      );
      
      if (!hasTimeConstraint && timeConstraintDays > 0) {
        const timeLimit = new Date();
        timeLimit.setDate(timeLimit.getDate() - timeConstraintDays);
        optimizedConstraints.push(
          where('updatedAt', '>=', timeLimit),
          orderBy('updatedAt', 'desc')
        );
      }
      
      // Add limit if not already present
      const hasLimit = constraints.some(constraint => constraint.toString().includes('limit'));
      if (!hasLimit && defaultLimit > 0) {
        optimizedConstraints.push(limit(defaultLimit));
      }
      
      const q = optimizedConstraints.length > 0 ? query(collectionRef, ...optimizedConstraints) : collectionRef;

      const snapshot = await getDocs(q);
      
      console.log('🔥 Firebase manual refetch:', {
        empty: snapshot.empty,
        size: snapshot.size,
        docs: snapshot.docs.length
      });
      
      const documents = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        return data;
      });
      
      setData(documents);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('🔥 Error refetching Firebase collection:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [collectionName, constraints, enabled, defaultLimit, timeConstraintDays]);

  return { data, loading, error, refetch };
};