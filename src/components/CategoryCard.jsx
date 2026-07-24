function CategoryCard({ title }) {
  return (
    <div className='category-card'>
      <div className='circle'></div>
      <p>{title}</p>
    </div>
  );
}

export default CategoryCard;