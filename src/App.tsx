import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, getFinishedOperations, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift } from './api';
import { auth, googleProvider, db } from './firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
