import { getCustomRepository, getRepository } from 'typeorm';
import csvOldParse from 'csv-parse';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

import { CreateTransactionServiceDTO } from './CreateTransactionService';

import AppError from '../errors/AppError';

// Promisifying csvParse
function csvParse(
  buffer: Buffer,
  options: csvOldParse.Options,
): Promise<CreateTransactionServiceDTO[]> {
  return new Promise((resolve, reject) => {
    csvOldParse(buffer, options, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

class ImportTransactionsService {
  public async execute(file: Express.Multer.File): Promise<Transaction[]> {
    // Getting transactions from csv file
    const results = await csvParse(file.buffer, { columns: true, trim: true });

    // Instantiating repositories
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    // Checking if all transactions will make the total less than zero, and interrupting if so
    const valueSum = results.reduce(
      (sum, transaction) =>
        transaction.type === 'income'
          ? sum + transaction.value
          : sum - transaction.value,
      0,
    );
    const { total } = await transactionRepository.getBalance();
    if (total + valueSum < 0) {
      throw new AppError('Total will be less than zero.', 400);
    }

    // Getting categories titles without duplicates
    const categoryTitles = Array.from(new Set(results.map(r => r.category)));

    // Array of promises to create categories that don't exist
    const categories = categoryTitles.map(async categoryTitle => {
      // Checking if chosen category already exists
      let chosenCategory = await categoryRepository.findOne({
        where: { title: categoryTitle },
      });

      // If chosen category does not exist, create and save it
      if (!chosenCategory) {
        chosenCategory = categoryRepository.create({ title: categoryTitle });
        await categoryRepository.save(chosenCategory);
      }
    });

    // Run category creation promises
    await Promise.all(categories);

    const promises = results.map(async result => {
      const { title, type, value, category } = result;

      const chosenCategory = await categoryRepository.findOne({
        where: { title: category },
      });

      // Create and save transaction
      const transaction = transactionRepository.create({
        title,
        type,
        value,
        category_id: chosenCategory?.id,
      });

      // Save this transaction
      await transactionRepository.save(transaction);

      // Return this transaction
      return transaction;
    });

    // Return the promises of created transactions
    return Promise.all(promises);
  }
}

export default ImportTransactionsService;
