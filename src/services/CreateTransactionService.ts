import { getCustomRepository, getRepository } from 'typeorm';
import Transaction, { TransactionType } from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface CategoryObject {
  title: string;
}
export interface CreateTransactionServiceDTO {
  title: string;
  type: TransactionType;
  value: number;
  category: CategoryObject;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: CreateTransactionServiceDTO): Promise<Transaction> {
    // Instantiating repositories
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    // Checking if this transaction will make the total less than zero, and interrupting if so
    if (type === TransactionType.outcome) {
      const { total } = await transactionRepository.getBalance();
      if (total < value) {
        throw new AppError('Total will be less than zero.', 400);
      }
    }

    // Checking if chosen category already exists
    let chosenCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    // If chosen category does not exist, create and save it
    if (!chosenCategory) {
      chosenCategory = categoryRepository.create({ title: category.title });
      await categoryRepository.save(chosenCategory);
    }

    // Create and save transaction
    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category_id: chosenCategory.id,
    });
    await transactionRepository.save(transaction);

    // Returning the added transaction
    return transaction;
  }
}

export default CreateTransactionService;
