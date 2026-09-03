import { useState, useEffect } from 'react';
import { ledgerTableDB, ledgerRowDB, accountDB, transactionDB } from '../db';
import type { LedgerTable, LedgerRow, Account, TransactionRecord } from '../types';
import { createLedgerTable, createLedgerRow, createAccount, createTransactionRecord, downloadCSV } from '../utils';
import Modal from '../components/Modal';

const PRESET_EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '学习资料', '娱乐', '医疗', '通讯', '居住', '其他'];
const PRESET_INCOME_CATEGORIES = ['生活费', '兼职收入', '红包', '理财收益', '报销', '其他'];

export default function Ledger() {
  const [view, setView] = useState<'table' | 'account' | 'transaction'>('transaction');
  const [tables, setTables] = useState<LedgerTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<LedgerTable | null>(null);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<LedgerTable | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; header: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([...PRESET_EXPENSE_CATEGORIES]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([...PRESET_INCOME_CATEGORIES]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    loadTables();
    loadAccounts();
    loadTransactions();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadRows(selectedTable.id);
    }
  }, [selectedTable]);

  const loadTables = async () => {
    const data = await ledgerTableDB.getAll();
    setTables(data);
    if (data.length > 0 && !selectedTable) {
      setSelectedTable(data[0]);
    }
  };

  const loadRows = async (tableId: string) => {
    const data = await ledgerRowDB.getByTable(tableId);
    setRows(data);
  };

  const openNewTable = () => {
    setEditingTable(createLedgerTable({}));
    setTableModalOpen(true);
  };

  const openEditTable = (table: LedgerTable) => {
    setEditingTable({ ...table });
    setTableModalOpen(true);
  };

  const saveTable = async () => {
    if (!editingTable || !editingTable.name.trim()) return;
    editingTable.updatedAt = new Date().toISOString();
    await ledgerTableDB.save(editingTable);
    setTableModalOpen(false);
    setEditingTable(null);
    loadTables();
  };

  const deleteTable = async (id: string) => {
    if (!confirm('确定删除此表格？所有数据将丢失。')) return;
    await ledgerTableDB.delete(id);
    if (selectedTable?.id === id) setSelectedTable(null);
    loadTables();
  };

  const addRow = async () => {
    if (!selectedTable) return;
    const row = createLedgerRow({ tableId: selectedTable.id, cells: {} });
    await ledgerRowDB.save(row);
    loadRows(selectedTable.id);
  };

  const deleteRow = async (id: string) => {
    await ledgerRowDB.delete(id);
    if (selectedTable) loadRows(selectedTable.id);
  };

  const startEditCell = (rowId: string, header: string, currentValue: string) => {
    setEditingCell({ rowId, header });
    setEditValue(currentValue);
  };

  const saveCell = async () => {
    if (!editingCell || !selectedTable) return;
    const row = rows.find((r) => r.id === editingCell.rowId);
    if (!row) return;
    row.cells = { ...row.cells, [editingCell.header]: editValue };
    await ledgerRowDB.save(row);
    setEditingCell(null);
    loadRows(selectedTable.id);
  };

  const exportCSV = () => {
    if (!selectedTable) return;
    const data = rows.map((r) => r.cells);
    downloadCSV(selectedTable.headers, data, `${selectedTable.name}.csv`);
  };

  const loadAccounts = async () => {
    const data = await accountDB.getAll();
    setAccounts(data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  };

  const openNewAccount = () => {
    setEditingAccount(createAccount({}));
    setAccountModalOpen(true);
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount({ ...account });
    setAccountModalOpen(true);
  };

  const saveAccount = async () => {
    if (!editingAccount || !editingAccount.name.trim()) return;
    editingAccount.updatedAt = new Date().toISOString();
    await accountDB.save(editingAccount);
    setAccountModalOpen(false);
    setEditingAccount(null);
    loadAccounts();
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('确定删除此账户？')) return;
    await accountDB.delete(id);
    loadAccounts();
    loadTransactions();
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const loadTransactions = async () => {
    const data = await transactionDB.getAll();
    setTransactions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const openNewTransaction = () => {
    setEditingTransaction(createTransactionRecord({
      type: 'expense',
      category: '餐饮',
      accountId: accounts.length > 0 ? accounts[0].id : '',
    }));
    setTransactionModalOpen(true);
  };

  const saveTransaction = async () => {
    if (!editingTransaction || !editingTransaction.accountId || editingTransaction.amount <= 0) return;
    editingTransaction.createdAt = new Date().toISOString();

    const account = accounts.find((a) => a.id === editingTransaction.accountId);
    if (account) {
      if (editingTransaction.type === 'expense') {
        account.balance -= editingTransaction.amount;
      } else {
        account.balance += editingTransaction.amount;
      }
      account.updatedAt = new Date().toISOString();
      await accountDB.save(account);
    }

    await transactionDB.save(editingTransaction);
    setTransactionModalOpen(false);
    setEditingTransaction(null);
    loadAccounts();
    loadTransactions();
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('确定删除此交易记录？')) return;
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      const account = accounts.find((a) => a.id === tx.accountId);
      if (account) {
        if (tx.type === 'expense') {
          account.balance += tx.amount;
        } else {
          account.balance -= tx.amount;
        }
        account.updatedAt = new Date().toISOString();
        await accountDB.save(account);
      }
    }
    await transactionDB.delete(id);
    loadAccounts();
    loadTransactions();
  };

  const addCustomCategory = () => {
    if (!newCategoryInput.trim()) return;
    if (editingTransaction?.type === 'expense') {
      if (!expenseCategories.includes(newCategoryInput.trim())) {
        setExpenseCategories([...expenseCategories, newCategoryInput.trim()]);
      }
    } else {
      if (!incomeCategories.includes(newCategoryInput.trim())) {
        setIncomeCategories([...incomeCategories, newCategoryInput.trim()]);
      }
    }
    setEditingTransaction(editingTransaction ? { ...editingTransaction, category: newCategoryInput.trim() } : null);
    setNewCategoryInput('');
    setShowAddCategory(false);
  };

  const currentCategories = editingTransaction?.type === 'expense' ? expenseCategories : incomeCategories;

  const calculateAmounts = () => {
    if (!selectedTable) return { income: 0, expense: 0 };
    const amountHeader = selectedTable.headers.find((h) => h.includes('金额'));
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      const val = parseFloat(row.cells[amountHeader || ''] || '0');
      if (!isNaN(val)) {
        if (val >= 0) income += val;
        else expense += Math.abs(val);
      }
    }
    return { income, expense };
  };

  const amounts = calculateAmounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">💰 记账中心</h2>
        <div className="flex gap-2">
          {view === 'transaction' && <button className="btn-primary" onClick={openNewTransaction}>+ 记一笔</button>}
          {view === 'table' && <button className="btn-primary" onClick={openNewTable}>+ 新建表格</button>}
          {view === 'account' && <button className="btn-primary" onClick={openNewAccount}>+ 添加账户</button>}
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'transaction' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setView('transaction')}
        >💳 收支记账</button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'account' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setView('account')}
        >🏦 账户管理</button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'table' ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          onClick={() => setView('table')}
        >📊 表格记账</button>
      </div>

      {/* ===== 收支记账视图 ===== */}
      {view === 'transaction' && (
        <>
          {/* 总资产 */}
          <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <div className="text-sm opacity-90">总资产</div>
            <div className="text-3xl font-bold mt-1">¥ {totalBalance.toFixed(2)}</div>
            <div className="text-xs opacity-70 mt-1">共 {accounts.length} 个账户</div>
          </div>

          {/* 交易流水列表 */}
          <div>
            <h3 className="font-semibold mb-3">📋 交易流水</h3>
            {transactions.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-4xl mb-3">💳</div>
                <p className="text-gray-400 text-sm">暂无交易记录</p>
                <p className="text-gray-400 text-xs mt-1">点击上方「记一笔」开始记账</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const account = accounts.find((a) => a.id === tx.accountId);
                  return (
                    <div key={tx.id} className="card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                          {tx.type === 'expense' ? '💸' : '💰'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{tx.category}</span>
                            {account && (
                              <span className="badge text-[10px]" style={{ backgroundColor: account.color + '20', color: account.color }}>
                                {account.icon} {account.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {tx.date}{tx.note ? ` · ${tx.note}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === 'expense' ? '-' : '+'}¥{tx.amount.toFixed(2)}
                        </span>
                        <button
                          className="text-gray-400 hover:text-red-500 text-xs"
                          onClick={() => deleteTransaction(tx.id)}
                        >🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== 表格记账视图 ===== */}
      {view === 'table' && (
        <>
          {/* 表格选择 */}
          <div className="flex gap-2 flex-wrap">
            {tables.map((t) => (
              <div key={t.id} className="relative group">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedTable?.id === t.id ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                  onClick={() => setSelectedTable(t)}
                >
                  {t.name} <span className="text-xs opacity-70">({t.category})</span>
                </button>
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
                  onClick={() => deleteTable(t.id)}
                >×</button>
              </div>
            ))}
            {tables.length === 0 && <p className="text-sm text-gray-400">暂无表格，请新建</p>}
          </div>

          {selectedTable && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center">
                  <div className="text-xs text-gray-500">收入</div>
                  <div className="text-lg font-bold text-green-500">+{amounts.income.toFixed(2)}</div>
                </div>
                <div className="card text-center">
                  <div className="text-xs text-gray-500">支出</div>
                  <div className="text-lg font-bold text-red-500">-{amounts.expense.toFixed(2)}</div>
                </div>
                <div className="card text-center">
                  <div className="text-xs text-gray-500">结余</div>
                  <div className={`text-lg font-bold ${amounts.income - amounts.expense >= 0 ? 'text-primary-500' : 'text-red-500'}`}>
                    {(amounts.income - amounts.expense).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {selectedTable.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-3 py-2 w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        {selectedTable.headers.map((h) => (
                          <td key={h} className="px-3 py-2">
                            {editingCell?.rowId === row.id && editingCell?.header === h ? (
                              <input
                                className="w-full px-1 py-0.5 border border-primary-300 rounded text-sm bg-white dark:bg-gray-700"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCell}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditingCell(null); }}
                                autoFocus
                              />
                            ) : (
                              <span className="cursor-pointer block min-w-[40px]" onClick={() => startEditCell(row.id, h, row.cells[h] || '')}>
                                {row.cells[h] || <span className="text-gray-300">-</span>}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => deleteRow(row.id)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">暂无数据，点击下方按钮添加行</p>}
              </div>

              <div className="flex gap-2">
                <button className="btn-secondary" onClick={addRow}>+ 添加行</button>
                <button className="btn-secondary" onClick={openEditTable.bind(null, selectedTable)}>⚙️ 编辑表结构</button>
                <button className="btn-secondary" onClick={exportCSV}>📥 导出CSV</button>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 账户管理视图 ===== */}
      {view === 'account' && (
        <>
          <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <div className="text-sm opacity-90">总资产</div>
            <div className="text-3xl font-bold mt-1">¥ {totalBalance.toFixed(2)}</div>
            <div className="text-xs opacity-70 mt-1">共 {accounts.length} 个账户</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditAccount(account)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: account.color + '20', color: account.color }}
                    >
                      {account.icon}
                    </div>
                    <div>
                      <div className="font-medium">{account.name}</div>
                      {account.note && <div className="text-xs text-gray-400">{account.note}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      ¥ {account.balance.toFixed(2)}
                    </span>
                    <button
                      className="text-gray-400 hover:text-red-500 text-xs"
                      onClick={(e) => { e.stopPropagation(); deleteAccount(account.id); }}
                    >🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {accounts.length === 0 && (
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">🏦</div>
              <p className="text-gray-400 text-sm">暂无账户，点击上方按钮添加</p>
              <p className="text-gray-400 text-xs mt-1">支持微信、支付宝、银行卡等多种账户</p>
            </div>
          )}
        </>
      )}

      {/* 表格编辑弹窗 */}
      <Modal open={tableModalOpen} onClose={() => { setTableModalOpen(false); setEditingTable(null); }} title="编辑表格">
        {editingTable && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">表格名称</label>
              <input className="input" value={editingTable.name} onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })} placeholder="如：日常开销" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分类</label>
              <input className="input" value={editingTable.category} onChange={(e) => setEditingTable({ ...editingTable, category: e.target.value })} placeholder="如：餐饮、学习、娱乐" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">表头（逗号分隔）</label>
              <input
                className="input"
                value={editingTable.headers.join(',')}
                onChange={(e) => setEditingTable({ ...editingTable, headers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                placeholder="日期,类别,金额,备注"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setTableModalOpen(false); setEditingTable(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveTable(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 账户编辑弹窗 */}
      <Modal open={accountModalOpen} onClose={() => { setAccountModalOpen(false); setEditingAccount(null); }} title={editingAccount?.id && accounts.find((a) => a.id === editingAccount.id) ? '编辑账户' : '添加账户'}>
        {editingAccount && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">账户名称</label>
              <input className="input" value={editingAccount.name} onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })} placeholder="如：微信零钱、支付宝、中国银行" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">余额</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={editingAccount.balance}
                onChange={(e) => setEditingAccount({ ...editingAccount, balance: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <input className="input" value={editingAccount.note || ''} onChange={(e) => setEditingAccount({ ...editingAccount, note: e.target.value })} placeholder="如：储蓄卡、工资卡" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">图标</label>
              <div className="flex gap-2 flex-wrap">
                {['💰','🏦','💳','📱','💚','💙','🟢','🔴','🟡','🟣','💎','🏧','💵','💴','💶'].map((icon) => (
                  <button
                    key={icon}
                    className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center ${editingAccount.icon === icon ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    onClick={() => setEditingAccount({ ...editingAccount, icon })}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">图标颜色</label>
              <div className="flex gap-2 flex-wrap">
                {['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: color, borderColor: editingAccount.color === color ? '#000' : 'transparent' }}
                    onClick={() => setEditingAccount({ ...editingAccount, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setAccountModalOpen(false); setEditingAccount(null); }}>取消</button>
              <button className="btn-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveAccount(); }}>保存</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 交易记录弹窗 */}
      <Modal open={transactionModalOpen} onClose={() => { setTransactionModalOpen(false); setEditingTransaction(null); setShowAddCategory(false); }} title="记一笔">
        {editingTransaction && (
          <div className="space-y-4">
            {/* 收支类型 */}
            <div>
              <label className="text-sm font-medium mb-2 block">类型</label>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${editingTransaction.type === 'expense' ? 'bg-red-100 dark:bg-red-900/20 ring-2 ring-red-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="type"
                    checked={editingTransaction.type === 'expense'}
                    onChange={() => setEditingTransaction({ ...editingTransaction, type: 'expense', category: expenseCategories[0] })}
                    className="accent-red-500"
                  />
                  <span className="text-sm font-medium">💸 支出</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${editingTransaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/20 ring-2 ring-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="type"
                    checked={editingTransaction.type === 'income'}
                    onChange={() => setEditingTransaction({ ...editingTransaction, type: 'income', category: incomeCategories[0] })}
                    className="accent-green-500"
                  />
                  <span className="text-sm font-medium">💰 收入</span>
                </label>
              </div>
            </div>

            {/* 账户选择 */}
            <div>
              <label className="text-sm font-medium mb-1 block">账户</label>
              {accounts.length === 0 ? (
                <p className="text-sm text-gray-400">请先在「账户管理」中添加账户</p>
              ) : (
                <select
                  className="input"
                  value={editingTransaction.accountId}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, accountId: e.target.value })}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name} (¥{a.balance.toFixed(2)})</option>
                  ))}
                </select>
              )}
            </div>

            {/* 分类 */}
            <div>
              <label className="text-sm font-medium mb-1 block">分类</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {currentCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${editingTransaction.category === cat ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    onClick={() => setEditingTransaction({ ...editingTransaction, category: cat })}
                  >{cat}</button>
                ))}
              </div>
              {showAddCategory ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="新分类名称"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCustomCategory(); }}
                    autoFocus
                  />
                  <button className="btn-primary btn-sm" onClick={addCustomCategory}>添加</button>
                  <button className="btn-secondary btn-sm" onClick={() => setShowAddCategory(false)}>取消</button>
                </div>
              ) : (
                <button className="text-xs text-primary-500 hover:underline" onClick={() => setShowAddCategory(true)}>+ 自定义新增分类</button>
              )}
            </div>

            {/* 金额 */}
            <div>
              <label className="text-sm font-medium mb-1 block">金额</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={editingTransaction.amount || ''}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            {/* 日期 */}
            <div>
              <label className="text-sm font-medium mb-1 block">交易日期</label>
              <input
                type="date"
                className="input"
                value={editingTransaction.date}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
              />
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <input
                className="input"
                value={editingTransaction.note}
                onChange={(e) => setEditingTransaction({ ...editingTransaction, note: e.target.value })}
                placeholder="如：午餐、地铁卡充值"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => { setTransactionModalOpen(false); setEditingTransaction(null); }}>取消</button>
              <button className="btn-primary" onClick={saveTransaction} disabled={accounts.length === 0}>保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}