import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    return transactions.reduce(
      (balance, transaction) => {
        const newBalance = { ...balance };
        if (transaction.type === 'income') {
          newBalance.income += transaction.value;
          newBalance.total += transaction.value;
        } else {
          newBalance.outcome += transaction.value;
          newBalance.total -= transaction.value;
        }
        return newBalance;
      },
      {
        total: 0,
        income: 0,
        outcome: 0,
      },
    );
  }
}

export default TransactionsRepository;
